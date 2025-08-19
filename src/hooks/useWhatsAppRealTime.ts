import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useToast } from '@/hooks/use-toast';

interface WhatsAppMessage {
  id: string;
  chipId: string;
  from: string;
  to: string;
  body: string;
  type: string;
  timestamp: number;
  hasMedia?: boolean;
  isGroupMsg?: boolean;
  author?: string;
  direction?: 'inbound' | 'outbound';
}

interface ConnectionStatus {
  chipId: string;
  status: string;
  isReady: boolean;
  lastSeen: string;
}

export function useWhatsAppRealTime() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [connectionStatuses, setConnectionStatuses] = useState<Map<string, ConnectionStatus>>(new Map());
  const { toast } = useToast();

  useEffect(() => {
    // Conectar ao servidor WebSocket
    const socketConnection = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });

    setSocket(socketConnection);

    // Event listeners
    socketConnection.on('connect', () => {
      console.log('📡 Conectado ao servidor WhatsApp');
      setConnected(true);
      toast({
        title: 'Conectado',
        description: 'Conexão com servidor WhatsApp estabelecida',
      });
    });

    socketConnection.on('disconnect', () => {
      console.log('📡 Desconectado do servidor WhatsApp');
      setConnected(false);
      toast({
        title: 'Desconectado',
        description: 'Conexão com servidor WhatsApp perdida',
        variant: 'destructive',
      });
    });

    // Status das conexões
    socketConnection.on('connections_status', (data) => {
      console.log('📊 Status das conexões:', data);
      const statusMap = new Map<string, ConnectionStatus>();
      data.connections.forEach((conn: any) => {
        statusMap.set(conn.chipId, conn);
      });
      setConnectionStatuses(statusMap);
    });

    // Atualizações de status
    socketConnection.on('status_updated', (data) => {
      console.log('🔄 Status atualizado:', data);
      setConnectionStatuses(prev => {
        const newMap = new Map(prev);
        newMap.set(data.chipId, {
          chipId: data.chipId,
          status: data.status,
          isReady: data.status === 'connected',
          lastSeen: new Date().toISOString()
        });
        return newMap;
      });

      if (data.status === 'connected') {
        toast({
          title: 'Chip Conectado',
          description: `Chip ${data.chipId} conectado com sucesso`,
        });
      }
    });

    // QR Code atualizado
    socketConnection.on('qr_updated', (data) => {
      console.log('📱 QR Code atualizado:', data.chipId);
      setConnectionStatuses(prev => {
        const newMap = new Map(prev);
        newMap.set(data.chipId, {
          chipId: data.chipId,
          status: 'qr_ready',
          isReady: false,
          lastSeen: new Date().toISOString()
        });
        return newMap;
      });

      toast({
        title: 'QR Code Disponível',
        description: `Escaneie o QR Code para conectar o chip ${data.chipId}`,
      });
    });

    // Nova mensagem recebida
    socketConnection.on('message_received', (data: WhatsAppMessage) => {
      console.log('💬 Nova mensagem:', data);
      setMessages(prev => [data, ...prev].slice(0, 100)); // Manter apenas as 100 mais recentes
      
      toast({
        title: 'Nova Mensagem',
        description: `De ${data.from}: ${data.body.substring(0, 50)}${data.body.length > 50 ? '...' : ''}`,
      });
    });

    // Status da mensagem
    socketConnection.on('message_status', (data) => {
      console.log('✅ Status da mensagem:', data);
      // Aqui você pode atualizar o status de entrega das mensagens
    });

    // Webhook recebido
    socketConnection.on('webhook_received', (data) => {
      console.log('🔗 Webhook recebido:', data);
    });

    // Cleanup
    return () => {
      socketConnection.disconnect();
    };
  }, [toast]);

  // Função para enviar comando via socket
  const sendCommand = (event: string, data: any) => {
    if (socket && connected) {
      socket.emit(event, data);
    } else {
      toast({
        title: 'Erro',
        description: 'Não conectado ao servidor WhatsApp',
        variant: 'destructive',
      });
    }
  };

  // Obter status de uma conexão específica
  const getConnectionStatus = (chipId: string): ConnectionStatus | undefined => {
    return connectionStatuses.get(chipId);
  };

  // Obter todas as conexões ativas
  const getActiveConnections = (): ConnectionStatus[] => {
    return Array.from(connectionStatuses.values()).filter(conn => conn.isReady);
  };

  // Limpar mensagens
  const clearMessages = () => {
    setMessages([]);
  };

  return {
    socket,
    connected,
    messages,
    connectionStatuses: Array.from(connectionStatuses.values()),
    sendCommand,
    getConnectionStatus,
    getActiveConnections,
    clearMessages
  };
}