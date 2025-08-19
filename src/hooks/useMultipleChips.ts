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

  // Conectar ao WebSocket para atualizações em tempo real
  useEffect(() => {
    const socketConnection = io('http://localhost:3001');
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
  }, []);

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
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/whatsapp/connections');
      
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
    } finally {
      setLoading(false);
    }
  };

  // Conectar um chip específico
  const connectChip = async (chipId: string) => {
    try {
      setConnections(prev => 
        prev.map(conn => 
          conn.chipId === chipId 
            ? { ...conn, status: 'connecting' }
            : conn
        )
      );

      await whatsappService.startConnection(chipId, '');
      
      // Atualizar status após iniciar conexão
      setTimeout(fetchAllConnections, 1000);
      
    } catch (error) {
      console.error(`Erro ao conectar chip ${chipId}:`, error);
      setConnections(prev => 
        prev.map(conn => 
          conn.chipId === chipId 
            ? { ...conn, status: 'error' }
            : conn
        )
      );
    }
  };

  // Desconectar um chip específico
  const disconnectChip = async (chipId: string) => {
    try {
      const response = await fetch('http://localhost:3001/whatsapp/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chipId })
      });

      if (response.ok) {
        setConnections(prev => 
          prev.map(conn => 
            conn.chipId === chipId 
              ? { ...conn, status: 'disconnected', hasQrCode: false }
              : conn
          )
        );
      }
    } catch (error) {
      console.error(`Erro ao desconectar chip ${chipId}:`, error);
    }
  };

  // Obter QR Code de um chip específico
  const getQrCode = async (chipId: string): Promise<string | null> => {
    try {
      const response = await fetch(`http://localhost:3001/whatsapp/status?chipId=${chipId}`);
      if (response.ok) {
        const data = await response.json();
        return data.qrCode || null;
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

  useEffect(() => {
    fetchAllConnections();
    
    // Polling para atualizar status periodicamente
    const interval = setInterval(fetchAllConnections, 30000); // 30 segundos
    
    return () => clearInterval(interval);
  }, []);

  return {
    connections,
    loading,
    socket,
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