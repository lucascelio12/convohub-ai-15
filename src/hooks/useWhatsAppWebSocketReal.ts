import { useState, useEffect, useCallback } from 'react';

interface WhatsAppConnection {
  chipId: string;  
  status: 'disconnected' | 'connecting' | 'qr_ready' | 'authenticated' | 'connected' | 'error';
  qrCode?: string;
  hasQrCode: boolean;
  isReady: boolean;
}

export function useWhatsAppWebSocketReal() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connections, setConnections] = useState<WhatsAppConnection[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Conectar ao WebSocket da Edge Function
  useEffect(() => {
    const connectWebSocket = async () => {
      try {
        // Tentar conectar à Edge Function via WebSocket
        const wsUrl = window.location.origin.replace('http', 'ws') + '/api/whatsapp-realtime';
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('Conectado ao WebSocket da Edge Function');
          setIsConnected(true);
          setSocket(ws);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('Mensagem WebSocket recebida:', data);

            switch (data.type) {
              case 'status_updated':
                updateConnectionStatus(data.chipId, data.status, data.isReady);
                break;
              case 'qr_updated':
                updateConnectionWithQR(data.chipId, data.qrCode, data.status);
                break;
              case 'error':
                console.error(`Erro para chip ${data.chipId}:`, data.message);
                updateConnectionStatus(data.chipId, 'error', false);
                break;
            }
          } catch (error) {
            console.error('Erro ao processar mensagem WebSocket:', error);
          }
        };

        ws.onclose = () => {
          console.log('WebSocket da Edge Function desconectado');
          setIsConnected(false);
          setSocket(null);
          
          // Tentar reconectar após 3 segundos
          setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = (error) => {
          console.error('Erro no WebSocket da Edge Function:', error);
          setIsConnected(false);
        };

      } catch (error) {
        console.error('Erro ao conectar WebSocket:', error);
        setIsConnected(false);
        
        // Tentar reconectar após 5 segundos
        setTimeout(connectWebSocket, 5000);
      }
    };

    connectWebSocket();

    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, []);

  // Atualizar status de uma conexão
  const updateConnectionStatus = useCallback((chipId: string, status: string, isReady: boolean = false) => {
    setConnections(prev => {
      const existingIndex = prev.findIndex(conn => conn.chipId === chipId);
      const updatedConnection: WhatsAppConnection = {
        chipId,
        status: status as any,
        hasQrCode: status === 'qr_ready',
        isReady,
      };

      if (existingIndex >= 0) {
        const newConnections = [...prev];
        newConnections[existingIndex] = { ...newConnections[existingIndex], ...updatedConnection };
        return newConnections;
      } else {
        return [...prev, updatedConnection];
      }
    });
  }, []);

  // Atualizar conexão com QR code
  const updateConnectionWithQR = useCallback((chipId: string, qrCode: string, status: string) => {
    setConnections(prev => {
      const existingIndex = prev.findIndex(conn => conn.chipId === chipId);
      const updatedConnection: WhatsAppConnection = {
        chipId,
        status: status as any,
        qrCode,
        hasQrCode: true,
        isReady: false,
      };

      if (existingIndex >= 0) {
        const newConnections = [...prev];
        newConnections[existingIndex] = { ...newConnections[existingIndex], ...updatedConnection };
        return newConnections;
      } else {
        return [...prev, updatedConnection];
      }
    });
  }, []);

  // Iniciar conexão para um chip
  const startConnection = useCallback((chipId: string) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      console.log('Iniciando conexão via WebSocket para chip:', chipId);
      socket.send(JSON.stringify({
        type: 'start_connection',
        chipId
      }));
      
      updateConnectionStatus(chipId, 'connecting');
      return true;
    }
    return false;
  }, [socket, updateConnectionStatus]);

  // Desconectar um chip
  const disconnectChip = useCallback((chipId: string) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      console.log('Desconectando chip via WebSocket:', chipId);
      socket.send(JSON.stringify({
        type: 'disconnect',
        chipId
      }));
      
      updateConnectionStatus(chipId, 'disconnected');
      return true;
    }
    return false;
  }, [socket, updateConnectionStatus]);

  // Obter status de um chip
  const getChipStatus = useCallback((chipId: string) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'get_status',
        chipId
      }));
    }
  }, [socket]);

  // Obter conexão específica
  const getConnection = useCallback((chipId: string): WhatsAppConnection | undefined => {
    return connections.find(conn => conn.chipId === chipId);
  }, [connections]);

  // Obter todas as conexões conectadas
  const getConnectedChips = useCallback((): WhatsAppConnection[] => {
    return connections.filter(conn => conn.status === 'connected');
  }, [connections]);

  return {
    isConnected,
    connections,
    startConnection,
    disconnectChip,
    getChipStatus,
    getConnection,
    getConnectedChips,
    socket
  };
}