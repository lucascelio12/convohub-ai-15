import { useEffect, useRef, useState } from 'react';

interface WebSocketMessage {
  type: string;
  chipId?: string;
  qrCode?: string;
  status?: string;
  messageId?: string;
  from?: string;
  message?: string;
  timestamp?: string;
}

interface UseWhatsAppWebSocketProps {
  chipId?: string;
  onQrCode?: (qrCode: string) => void;
  onStatusChange?: (status: string) => void;
  onMessageReceived?: (message: any) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export function useWhatsAppWebSocket({
  chipId,
  onQrCode,
  onStatusChange,
  onMessageReceived,
  onConnected,
  onDisconnected
}: UseWhatsAppWebSocketProps) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const maxReconnectAttempts = 5;

  const connect = () => {
    if (!chipId) return;

    try {
      const ws = new WebSocket('ws://localhost:3001');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log(`WebSocket conectado para chip: ${chipId}`);
        setConnected(true);
        setReconnectAttempts(0);
        
        // Inscrever-se para receber updates do chip
        ws.send(JSON.stringify({
          type: 'subscribe',
          chipId
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          console.log('WebSocket message:', data);

          switch (data.type) {
            case 'subscribed':
              console.log(`Inscrito para chip ${data.chipId}, status: ${data.status}`);
              if (data.status && onStatusChange) {
                onStatusChange(data.status);
              }
              break;

            case 'qr_generated':
              console.log(`QR Code recebido para chip ${data.chipId}`);
              if (data.qrCode && onQrCode) {
                onQrCode(data.qrCode);
              }
              if (onStatusChange) {
                onStatusChange('qr_generated');
              }
              break;

            case 'connected':
              console.log(`Chip ${data.chipId} conectado`);
              if (onStatusChange) {
                onStatusChange('connected');
              }
              if (onConnected) {
                onConnected();
              }
              break;

            case 'disconnected':
              console.log(`Chip ${data.chipId} desconectado`);
              if (onStatusChange) {
                onStatusChange('disconnected');
              }
              if (onDisconnected) {
                onDisconnected();
              }
              break;

            case 'message_received':
              console.log(`Mensagem recebida no chip ${data.chipId}:`, data.message);
              if (onMessageReceived) {
                onMessageReceived({
                  chipId: data.chipId,
                  messageId: data.messageId,
                  from: data.from,
                  message: data.message,
                  timestamp: data.timestamp,
                  type: 'received'
                });
              }
              break;

            default:
              console.log('Tipo de mensagem WebSocket desconhecido:', data.type);
          }
        } catch (error) {
          console.error('Erro ao processar mensagem WebSocket:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket desconectado');
        setConnected(false);
        
        // Tentar reconectar automaticamente
        if (reconnectAttempts < maxReconnectAttempts) {
          setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connect();
          }, 2000 * (reconnectAttempts + 1)); // Backoff exponencial
        }
      };

      ws.onerror = (error) => {
        console.error('Erro no WebSocket:', error);
      };

    } catch (error) {
      console.error('Erro ao conectar WebSocket:', error);
    }
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setConnected(false);
    }
  };

  useEffect(() => {
    if (chipId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [chipId]);

  return {
    connected,
    reconnectAttempts,
    connect,
    disconnect
  };
}