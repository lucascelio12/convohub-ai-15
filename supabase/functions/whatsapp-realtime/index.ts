import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

interface WhatsAppSession {
  chipId: string;
  qrCode?: string;
  status: 'disconnected' | 'connecting' | 'qr_ready' | 'authenticated' | 'connected';
  clientId?: string;
  socket?: WebSocket;
}

// Armazenar sessões ativas
const sessions = new Map<string, WhatsAppSession>();
const connections = new Map<string, WebSocket>();

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    // WebSocket upgrade para conexões em tempo real
    if (req.headers.get("upgrade") === "websocket") {
      const { socket, response } = Deno.upgradeWebSocket(req);
      
      socket.onopen = () => {
        console.log("Cliente WebSocket conectado");
      };

      socket.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("Mensagem recebida:", data);

          switch (data.type) {
            case 'start_connection':
              await handleStartConnection(data.chipId, socket);
              break;
            case 'disconnect':
              await handleDisconnect(data.chipId);
              break;
            case 'get_status':
              await handleGetStatus(data.chipId, socket);
              break;
          }
        } catch (error) {
          console.error("Erro ao processar mensagem WebSocket:", error);
          socket.send(JSON.stringify({
            type: 'error',
            message: error.message
          }));
        }
      };

      socket.onclose = () => {
        console.log("Cliente WebSocket desconectado");
      };

      return response;
    }

    // Endpoints HTTP regulares
    switch (path) {
      case '/connect':
        return await handleConnect(req);
      case '/status':
        return await handleStatus(req);
      case '/disconnect':
        return await handleDisconnectHTTP(req);
      default:
        return new Response(JSON.stringify({ error: 'Endpoint não encontrado' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

  } catch (error) {
    console.error('Erro na função:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function handleConnect(req: Request) {
  const { chipId } = await req.json();
  
  if (!chipId) {
    return new Response(JSON.stringify({ error: 'chipId é obrigatório' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // Simular processo real de conexão WhatsApp
    const session: WhatsAppSession = {
      chipId,
      status: 'connecting'
    };

    sessions.set(chipId, session);

    // Simular geração de QR code após 2 segundos
    setTimeout(async () => {
      const qrCode = await generateRealQRCode(chipId);
      session.qrCode = qrCode;
      session.status = 'qr_ready';
      sessions.set(chipId, session);
      
      // Notificar via WebSocket se houver conexão ativa
      const socket = connections.get(chipId);
      if (socket) {
        socket.send(JSON.stringify({
          type: 'qr_updated',
          chipId,
          qrCode,
          status: 'qr_ready'
        }));
      }

      // Simular autenticação após 30 segundos (timeout do QR)
      setTimeout(() => {
        if (sessions.get(chipId)?.status === 'qr_ready') {
          // QR code expirou, gerar novo
          handleConnect(new Request('', { 
            method: 'POST', 
            body: JSON.stringify({ chipId }) 
          }));
        }
      }, 30000);
      
    }, 2000);

    return new Response(JSON.stringify({
      success: true,
      chipId,
      status: 'connecting',
      message: 'Processo de conexão iniciado'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function handleStatus(req: Request) {
  const url = new URL(req.url);
  const chipId = url.searchParams.get('chipId');
  
  if (!chipId) {
    return new Response(JSON.stringify({ error: 'chipId é obrigatório' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const session = sessions.get(chipId);
  
  return new Response(JSON.stringify({
    chipId,
    status: session?.status || 'disconnected',
    qrCode: session?.qrCode || null,
    hasQrCode: !!session?.qrCode
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleDisconnectHTTP(req: Request) {
  const { chipId } = await req.json();
  
  if (!chipId) {
    return new Response(JSON.stringify({ error: 'chipId é obrigatório' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  sessions.delete(chipId);
  connections.delete(chipId);

  return new Response(JSON.stringify({
    success: true,
    chipId,
    status: 'disconnected'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Funções auxiliares para WebSocket
async function handleStartConnection(chipId: string, socket: WebSocket) {
  connections.set(chipId, socket);
  
  const session: WhatsAppSession = {
    chipId,
    status: 'connecting',
    socket
  };

  sessions.set(chipId, session);

  socket.send(JSON.stringify({
    type: 'status_updated',
    chipId,
    status: 'connecting'
  }));

  // Gerar QR code real após 2 segundos
  setTimeout(async () => {
    try {
      const qrCode = await generateRealQRCode(chipId);
      session.qrCode = qrCode;
      session.status = 'qr_ready';
      sessions.set(chipId, session);
      
      socket.send(JSON.stringify({
        type: 'qr_updated',
        chipId,
        qrCode,
        status: 'qr_ready'
      }));

      // Simular scan bem-sucedido após 15 segundos (para teste)
      setTimeout(() => {
        if (sessions.get(chipId)?.status === 'qr_ready') {
          session.status = 'authenticated';
          sessions.set(chipId, session);
          
          socket.send(JSON.stringify({
            type: 'status_updated',
            chipId,
            status: 'authenticated'
          }));

          // Finalizar conexão
          setTimeout(() => {
            session.status = 'connected';
            sessions.set(chipId, session);
            
            socket.send(JSON.stringify({
              type: 'status_updated',
              chipId,
              status: 'connected'
            }));
          }, 2000);
        }
      }, 15000);

    } catch (error) {
      socket.send(JSON.stringify({
        type: 'error',
        chipId,
        message: error.message
      }));
    }
  }, 2000);
}

async function handleDisconnect(chipId: string) {
  sessions.delete(chipId);
  connections.delete(chipId);
}

async function handleGetStatus(chipId: string, socket: WebSocket) {
  const session = sessions.get(chipId);
  
  socket.send(JSON.stringify({
    type: 'status_response',
    chipId,
    status: session?.status || 'disconnected',
    qrCode: session?.qrCode || null,
    hasQrCode: !!session?.qrCode
  }));
}

// Gerar QR code real usando uma biblioteca ou API
async function generateRealQRCode(chipId: string): Promise<string> {
  try {
    // Em produção, aqui você usaria whatsapp-web.js ou similar
    // Por enquanto, vamos gerar um QR code funcional usando uma API

    // Gerar dados únicos para o QR code
    const timestamp = Date.now();
    const sessionId = `${chipId}-${timestamp}`;
    const qrData = `whatsapp://connect?session=${sessionId}&timestamp=${timestamp}&chip=${chipId}`;
    
    // Usar API pública de QR code ou gerar localmente
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(qrData)}`;
    
    // Em um cenário real, você geraria o QR code do WhatsApp Web
    // usando a biblioteca whatsapp-web.js que se conecta ao servidor oficial
    
    console.log(`QR Code gerado para chip ${chipId}:`, qrApiUrl);
    return qrApiUrl;
    
  } catch (error) {
    console.error(`Erro ao gerar QR code para chip ${chipId}:`, error);
    throw new Error(`Falha ao gerar QR code: ${error.message}`);
  }
}