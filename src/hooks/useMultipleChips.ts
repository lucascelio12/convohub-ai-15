import { useState, useEffect, useCallback } from 'react';
import { whatsappService } from '@/services/whatsapp';
import { io, Socket } from 'socket.io-client';
import { useWhatsAppWebSocketReal } from './useWhatsAppWebSocketReal';

interface ChipConnection {
  chipId: string;
  status: 'disconnected' | 'connecting' | 'qr_ready' | 'connected' | 'error' | 'authenticated';
  hasQrCode: boolean;
  isReady?: boolean;
  lastSeen?: string;
}

export function useMultipleChips() {
  const [connections, setConnections] = useState<ChipConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [serverAvailable, setServerAvailable] = useState(false);
  const [simulatedConnections, setSimulatedConnections] = useState<Map<string, ChipConnection>>(new Map());

  // Hook para Edge Function (produção)
  const {
    isConnected: edgeFunctionConnected,
    connections: edgeConnections,
    startConnection: edgeStartConnection,
    disconnectChip: edgeDisconnectChip,
    getConnection: edgeGetConnection
  } = useWhatsAppWebSocketReal();

  // URL do servidor WhatsApp (configurável)
  const WHATSAPP_SERVER_URL = import.meta.env.VITE_WHATSAPP_SERVER_URL || 'http://localhost:3001';

  // Conectar ao WebSocket para atualizações em tempo real (apenas se servidor disponível)
  useEffect(() => {
    // Primeiro verificar se o servidor está disponível
    fetch(`${WHATSAPP_SERVER_URL}/health`)
      .then(() => {
        setServerAvailable(true);
        const socketConnection = io(WHATSAPP_SERVER_URL);
        setSocket(socketConnection);

        // Ouvir atualizações de status
        socketConnection.on('status_updated', (data) => {
          console.log('Status atualizado:', data);
          updateConnectionStatus(data.chipId, data.status, data.status === 'connected');
        });

        // Ouvir atualizações de QR Code
        socketConnection.on('qr_updated', (data) => {
          console.log('QR Code atualizado:', data);
          updateConnectionStatus(data.chipId, data.status, false, true);
        });

        // Ouvir mensagens recebidas
        socketConnection.on('message_received', (data) => {
          console.log('Mensagem recebida:', data);
          // Aqui você pode adicionar lógica adicional para processar mensagens
        });

        // Ouvir status inicial das conexões
        socketConnection.on('connections_status', (data) => {
          console.log('Status das conexões:', data);
          const mappedConnections = data.connections.map((conn: any) => ({
            chipId: conn.chipId,
            status: conn.status,
            hasQrCode: conn.status === 'qr_ready',
            isReady: conn.isReady,
            lastSeen: conn.lastSeen
          }));
          setConnections(mappedConnections);
        });

        return () => {
          socketConnection.disconnect();
        };
      })
      .catch(() => {
        setServerAvailable(false);
        console.log('Servidor WhatsApp não disponível em:', WHATSAPP_SERVER_URL);
      });
  }, [WHATSAPP_SERVER_URL]);

  // Atualizar status de uma conexão específica
  const updateConnectionStatus = useCallback((chipId: string, status: string, isReady: boolean = false, hasQrCode: boolean = false) => {
    setConnections(prev => {
      const existingIndex = prev.findIndex(conn => conn.chipId === chipId);
      const updatedConnection = {
        chipId,
        status: status as ChipConnection['status'],
        hasQrCode,
        isReady,
        lastSeen: new Date().toISOString()
      };

      if (existingIndex >= 0) {
        const newConnections = [...prev];
        newConnections[existingIndex] = updatedConnection;
        return newConnections;
      } else {
        return [...prev, updatedConnection];
      }
    });
  }, []);

  // Fetch status de todas as conexões
  const fetchAllConnections = async () => {
    if (!serverAvailable) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${WHATSAPP_SERVER_URL}/whatsapp/connections`);
      
      if (response.ok) {
        const data = await response.json();
        const mappedConnections = data.connections.map((conn: any) => ({
          chipId: conn.chipId,
          status: conn.status,
          hasQrCode: conn.hasQrCode,
          isReady: conn.isReady,
          lastSeen: conn.lastSeen
        }));
        setConnections(mappedConnections);
      } else {
        console.log('Servidor WhatsApp não disponível');
        setConnections([]);
      }
    } catch (error) {
      console.log('Erro ao buscar conexões:', error);
      setConnections([]);
      setServerAvailable(false);
    } finally {
      setLoading(false);
    }
  };

  // Conectar um chip específico - prioridade: Edge Function > Servidor Local > Simulação
  const connectChip = async (chipId: string) => {
    try {
      updateConnectionStatus(chipId, 'connecting');
      
      // 1. Primeiro tentar Edge Function (produção)
      if (edgeFunctionConnected) {
        console.log('Usando Edge Function para conexão real:', chipId);
        const success = edgeStartConnection(chipId);
        if (success) {
          return;
        }
      }

      // 2. Fallback para servidor local
      if (serverAvailable) {
        console.log('Usando servidor local para conexão:', chipId);
        await whatsappService.startConnection(chipId, '');
        setTimeout(fetchAllConnections, 1000);
        return;
      }

      // 3. Modo simulado para desenvolvimento (último recurso)
      console.log('Simulando conexão do chip (modo dev):', chipId);
      
      // Simular processo de conexão mais realista
      setTimeout(() => {
        updateConnectionStatus(chipId, 'qr_ready', false, true);
        console.log('QR Code simulado gerado para chip:', chipId);
        
        // Simular conexão bem-sucedida após 15 segundos
        setTimeout(() => {
          updateConnectionStatus(chipId, 'authenticated', false, false);
          console.log('Chip simulado autenticado:', chipId);
          
          // Finalizar conexão
          setTimeout(() => {
            updateConnectionStatus(chipId, 'connected', true, false);
            console.log('Chip simulado conectado:', chipId);
          }, 2000);
        }, 15000);
        
      }, 2000);
      
    } catch (error) {
      console.error(`Erro ao conectar chip ${chipId}:`, error);
      updateConnectionStatus(chipId, 'error');
    }
  };

  // Desconectar um chip específico
  const disconnectChip = async (chipId: string) => {    
    try {
      // 1. Tentar Edge Function primeiro
      if (edgeFunctionConnected) {
        const success = edgeDisconnectChip(chipId);
        if (success) {
          return;
        }
      }

      // 2. Servidor local
      if (serverAvailable) {
        const response = await fetch(`${WHATSAPP_SERVER_URL}/whatsapp/disconnect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chipId })
        });

        if (response.ok) {
          updateConnectionStatus(chipId, 'disconnected', false, false);
          return;
        }
      }

      // 3. Modo simulado
      console.log('Simulando desconexão do chip:', chipId);
      updateConnectionStatus(chipId, 'disconnected', false, false);
      
    } catch (error) {
      console.error(`Erro ao desconectar chip ${chipId}:`, error);
    }
  };

  // Obter QR Code de um chip específico (prioridade: Edge Function > Servidor Local > Simulação)
  const getQrCode = async (chipId: string): Promise<string | null> => {
    try {
      // 1. Primeiro tentar Edge Function (produção)
      if (edgeFunctionConnected) {
        const edgeConnection = edgeGetConnection(chipId);
        if (edgeConnection?.qrCode) {
          console.log('QR Code obtido da Edge Function');
          return edgeConnection.qrCode;
        }
      }

      // 2. Fallback para servidor local
      if (serverAvailable) {
        const response = await fetch(`${WHATSAPP_SERVER_URL}/whatsapp/status?chipId=${chipId}`);
        if (response.ok) {
          const data = await response.json();
          console.log('QR Code obtido do servidor local:', data.qrCode ? 'disponível' : 'não disponível');
          return data.qrCode || null;
        }
        return null;
      }

      // 3. Modo simulado - gerar QR code mais realista
      const chipStatus = connections.find(c => c.chipId === chipId);
      if (chipStatus?.hasQrCode) {
        console.log('Gerando QR Code simulado realista para chip:', chipId);
        
        // Gerar QR code usando API externa (mais realista)
        const timestamp = Date.now();
        const qrData = `whatsapp://connect?session=${chipId}-${timestamp}&dev=true`;
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(qrData)}`;
        
        console.log('QR Code simulado gerado:', qrApiUrl);
        return qrApiUrl;
      }
      return null;
      
    } catch (error) {
      console.error(`Erro ao obter QR Code do chip ${chipId}:`, error);
      return null;
    }
  };

  // Enviar mensagem através de um chip específico
  const sendMessage = async (chipId: string, phone: string, message: string) => {
    try {
      return await whatsappService.sendMessage(chipId, phone, message, '');
    } catch (error) {
      console.error(`Erro ao enviar mensagem via chip ${chipId}:`, error);
      throw error;
    }
  };

  // Verificar status de um chip específico
  const getChipStatus = (chipId: string): ChipConnection | undefined => {
    return connections.find(conn => conn.chipId === chipId);
  };

  // Obter todos os chips conectados
  const getConnectedChips = (): ChipConnection[] => {
    return connections.filter(conn => conn.status === 'connected');
  };

  // Obter estatísticas das conexões
  const getConnectionStats = () => {
    const total = connections.length;
    const connected = connections.filter(c => c.status === 'connected').length;
    const connecting = connections.filter(c => c.status === 'connecting' || c.status === 'qr_ready').length;
    const disconnected = connections.filter(c => c.status === 'disconnected').length;
    const error = connections.filter(c => c.status === 'error').length;

    return {
      total,
      connected,
      connecting,
      disconnected,
      error
    };
  };

  // Combinar conexões do Edge Function com conexões locais/simuladas
  const getAllConnections = useCallback(() => {
    // Priorizar conexões da Edge Function se disponível
    if (edgeFunctionConnected && edgeConnections.length > 0) {
      return edgeConnections.map(conn => ({
        chipId: conn.chipId,
        status: conn.status,
        hasQrCode: conn.hasQrCode,
        isReady: conn.isReady,
        lastSeen: new Date().toISOString()
      }));
    }
    
    // Fallback para conexões locais/simuladas
    return connections;
  }, [edgeFunctionConnected, edgeConnections, connections]);

  useEffect(() => {
    if (serverAvailable) {
      fetchAllConnections();
      
      // Polling para atualizar status periodicamente (apenas se servidor disponível)
      const interval = setInterval(fetchAllConnections, 30000); // 30 segundos
      
      return () => clearInterval(interval);
    }
  }, [serverAvailable]);

  return {
    connections: getAllConnections(),
    loading,
    socket,
    serverAvailable,
    edgeFunctionConnected,
    connectChip,
    disconnectChip,
    getQrCode,
    sendMessage,
    getChipStatus,
    getConnectedChips,
    getConnectionStats,
    fetchAllConnections,
    updateConnectionStatus
  };
}