import { useState, useEffect, useCallback } from 'react';
import { whatsappService } from '@/services/whatsapp';
import { io, Socket } from 'socket.io-client';

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

  // Conectar um chip específico
  const connectChip = async (chipId: string) => {
    try {
      updateConnectionStatus(chipId, 'connecting');
      
      if (serverAvailable) {
        // Usar servidor real
        await whatsappService.startConnection(chipId, '');
        setTimeout(fetchAllConnections, 1000);
      } else {
        // Modo simulado para desenvolvimento
        console.log('Simulando conexão do chip:', chipId);
        
        // Simular processo de conexão
        setTimeout(() => {
          updateConnectionStatus(chipId, 'qr_ready', false, true);
          console.log('QR Code simulado gerado para chip:', chipId);
          
          // Simular conexão bem-sucedida após 10 segundos
          setTimeout(() => {
            updateConnectionStatus(chipId, 'connected', true, false);
            console.log('Chip simulado conectado:', chipId);
          }, 10000);
          
        }, 2000);
      }
      
    } catch (error) {
      console.error(`Erro ao conectar chip ${chipId}:`, error);
      updateConnectionStatus(chipId, 'error');
    }
  };

  // Desconectar um chip específico
  const disconnectChip = async (chipId: string) => {    
    try {
      if (serverAvailable) {
        // Usar servidor real
        const response = await fetch(`${WHATSAPP_SERVER_URL}/whatsapp/disconnect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chipId })
        });

        if (response.ok) {
          updateConnectionStatus(chipId, 'disconnected', false, false);
        }
      } else {
        // Modo simulado
        console.log('Simulando desconexão do chip:', chipId);
        updateConnectionStatus(chipId, 'disconnected', false, false);
      }
    } catch (error) {
      console.error(`Erro ao desconectar chip ${chipId}:`, error);
    }
  };

  // Obter QR Code de um chip específico
  const getQrCode = async (chipId: string): Promise<string | null> => {
    try {
      if (serverAvailable) {
        // Usar servidor real
        const response = await fetch(`${WHATSAPP_SERVER_URL}/whatsapp/status?chipId=${chipId}`);
        if (response.ok) {
          const data = await response.json();
          return data.qrCode || null;
        }
        return null;
      } else {
        // Modo simulado - gerar QR code visual
        const chipStatus = connections.find(c => c.chipId === chipId);
        if (chipStatus?.hasQrCode) {
          console.log('Gerando QR Code simulado para chip:', chipId);
          
          // Gerar QR code simulado visual
          const canvas = document.createElement('canvas');
          canvas.width = 200;
          canvas.height = 200;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            // Fundo branco
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, 200, 200);
            
            // Desenhar padrão que parece um QR code
            ctx.fillStyle = '#000000';
            
            // Cantos principais (quadrados grandes)
            ctx.fillRect(10, 10, 50, 50);
            ctx.fillRect(140, 10, 50, 50);
            ctx.fillRect(10, 140, 50, 50);
            
            // Quadrados internos dos cantos
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(20, 20, 30, 30);
            ctx.fillRect(150, 20, 30, 30);
            ctx.fillRect(20, 150, 30, 30);
            
            // Pontos centrais
            ctx.fillStyle = '#000000';
            ctx.fillRect(30, 30, 10, 10);
            ctx.fillRect(160, 30, 10, 10);
            ctx.fillRect(30, 160, 10, 10);
            
            // Padrão aleatório para simular dados
            for (let i = 70; i < 190; i += 10) {
              for (let j = 70; j < 130; j += 10) {
                if (Math.random() > 0.5) {
                  ctx.fillRect(i, j, 8, 8);
                }
              }
            }
            
            // Mais alguns padrões
            for (let i = 10; i < 60; i += 10) {
              for (let j = 70; j < 130; j += 10) {
                if (Math.random() > 0.6) {
                  ctx.fillRect(i, j, 8, 8);
                }
              }
            }
            
            return canvas.toDataURL();
          }
        }
        return null;
      }
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

  useEffect(() => {
    if (serverAvailable) {
      fetchAllConnections();
      
      // Polling para atualizar status periodicamente (apenas se servidor disponível)
      const interval = setInterval(fetchAllConnections, 30000); // 30 segundos
      
      return () => clearInterval(interval);
    }
  }, [serverAvailable]);

  return {
    connections,
    loading,
    socket,
    serverAvailable,
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