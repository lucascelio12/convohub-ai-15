import { useState, useEffect } from 'react';
import { whatsappService } from '@/services/whatsapp';

interface ChipConnection {
  chipId: string;
  status: 'disconnected' | 'connecting' | 'qr_generated' | 'connected' | 'error';
  hasQrCode: boolean;
}

export function useMultipleChips() {
  const [connections, setConnections] = useState<ChipConnection[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch status de todas as conexões
  const fetchAllConnections = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/whatsapp/connections');
      
      if (response.ok) {
        const data = await response.json();
        setConnections(data.connections || []);
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
      const response = await whatsappService.getStatus(chipId, '');
      return response.qrCode || null;
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
    const connecting = connections.filter(c => c.status === 'connecting' || c.status === 'qr_generated').length;
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
    connectChip,
    disconnectChip,
    getQrCode,
    sendMessage,
    getChipStatus,
    getConnectedChips,
    getConnectionStats,
    fetchAllConnections
  };
}