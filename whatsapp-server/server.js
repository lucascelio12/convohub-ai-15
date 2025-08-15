const express = require('express');
const cors = require('cors');
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const P = require('pino');
const QRCode = require('qrcode');
const NodeCache = require('node-cache');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const port = 3001;

// WebSocket Server para sincronização em tempo real
const wss = new WebSocket.Server({ server });

// Cache para sessões ativas
const sessionsCache = new NodeCache({ stdTTL: 600 }); // 10 minutos
const activeSockets = new Map();
const wsClients = new Map(); // chipId -> WebSocket connections

app.use(cors());
app.use(express.json());

// Logger
const logger = P({ timestamp: () => `,"time":"${new Date().toJSON()}"` }, P.destination('./whatsapp.log'));

// WebSocket para sincronização em tempo real
wss.on('connection', (ws, req) => {
  console.log('Cliente WebSocket conectado');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'subscribe' && data.chipId) {
        // Registrar cliente para receber updates de um chip específico
        if (!wsClients.has(data.chipId)) {
          wsClients.set(data.chipId, new Set());
        }
        wsClients.get(data.chipId).add(ws);
        
        ws.chipId = data.chipId;
        ws.send(JSON.stringify({
          type: 'subscribed',
          chipId: data.chipId,
          status: sessionsCache.get(`${data.chipId}_status`) || 'disconnected'
        }));
        
        console.log(`Cliente inscrito para chip: ${data.chipId}`);
      }
    } catch (error) {
      console.error('Erro ao processar mensagem WebSocket:', error);
    }
  });
  
  ws.on('close', () => {
    // Remover cliente da lista quando desconectar
    if (ws.chipId && wsClients.has(ws.chipId)) {
      wsClients.get(ws.chipId).delete(ws);
      if (wsClients.get(ws.chipId).size === 0) {
        wsClients.delete(ws.chipId);
      }
    }
    console.log('Cliente WebSocket desconectado');
  });
});

// Função para broadcast de status para clientes WebSocket
function broadcastToChip(chipId, data) {
  if (wsClients.has(chipId)) {
    const clients = wsClients.get(chipId);
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }
}

// Webhook URL base para o frontend (configurável)
const FRONTEND_WEBHOOK_URL = process.env.FRONTEND_WEBHOOK_URL || 'http://localhost:8080/api/webhooks/whatsapp';

// Função para enviar webhook para o frontend
async function sendWebhook(event, data) {
  try {
    const response = await fetch(FRONTEND_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event,
        data,
        timestamp: new Date().toISOString()
      })
    });
    
    if (!response.ok) {
      console.log('Webhook não disponível no frontend (normal em desenvolvimento)');
    }
  } catch (error) {
    console.log('Frontend webhook não configurado (normal em desenvolvimento)');
  }
}

// Função para criar conexão WhatsApp
async function createWhatsAppConnection(chipId) {
  try {
    console.log(`Criando conexão para chip: ${chipId}`);
    
    // Estado de autenticação
    const { state, saveCreds } = await useMultiFileAuthState(`./auth_sessions/${chipId}`);
    
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger,
      browser: ['WhatsApp Manager', 'Chrome', '1.0.0'],
    });

    // Eventos da conexão
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      console.log(`Conexão ${chipId}:`, connection);
      
      if (qr) {
        // Gerar QR Code
        const qrCodeData = await QRCode.toDataURL(qr);
        sessionsCache.set(`${chipId}_qr`, qrCodeData);
        sessionsCache.set(`${chipId}_status`, 'qr_generated');
        
        // Broadcast para clientes WebSocket
        broadcastToChip(chipId, {
          type: 'qr_generated',
          chipId,
          qrCode: qrCodeData
        });
        
        // Webhook para frontend
        await sendWebhook('qr_generated', { chipId, qrCode: qrCodeData });
        
        console.log(`QR Code gerado para ${chipId}`);
      }
      
      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log('Conexão fechada, reconectando...', shouldReconnect);
        
        sessionsCache.set(`${chipId}_status`, 'disconnected');
        activeSockets.delete(chipId);
        
        // Broadcast desconexão
        broadcastToChip(chipId, {
          type: 'disconnected',
          chipId
        });
        
        // Webhook para frontend
        await sendWebhook('disconnected', { chipId });
        
        if (shouldReconnect) {
          setTimeout(() => createWhatsAppConnection(chipId), 3000);
        }
      } else if (connection === 'open') {
        console.log(`WhatsApp conectado para chip: ${chipId}`);
        sessionsCache.set(`${chipId}_status`, 'connected');
        activeSockets.set(chipId, sock);
        
        // Broadcast conexão
        broadcastToChip(chipId, {
          type: 'connected',
          chipId
        });
        
        // Webhook para frontend
        await sendWebhook('connected', { chipId });
      }
    });

    sock.ev.on('creds.update', saveCreds);
    
    // Listener para mensagens recebidas
    sock.ev.on('messages.upsert', async (m) => {
      const message = m.messages[0];
      if (!message.key.fromMe && message.message) {
        const messageData = {
          chipId,
          messageId: message.key.id,
          from: message.key.remoteJid,
          message: message.message.conversation || message.message.extendedTextMessage?.text || 'Mensagem não textual',
          timestamp: new Date(message.messageTimestamp * 1000).toISOString(),
          type: 'received'
        };
        
        console.log(`Mensagem recebida no chip ${chipId}:`, messageData);
        
        // Broadcast para clientes WebSocket
        broadcastToChip(chipId, {
          type: 'message_received',
          ...messageData
        });
        
        // Webhook para frontend
        await sendWebhook('message_received', messageData);
      }
    });
    
    return sock;
  } catch (error) {
    console.error(`Erro ao criar conexão ${chipId}:`, error);
    sessionsCache.set(`${chipId}_status`, 'error');
    throw error;
  }
}

// Rotas da API

// Iniciar conexão
app.post('/whatsapp/connect', async (req, res) => {
  try {
    const { chipId } = req.body;
    
    if (!chipId) {
      return res.status(400).json({ error: 'chipId é obrigatório' });
    }

    console.log(`Iniciando conexão para chip: ${chipId}`);
    
    // Verificar se já existe conexão ativa
    if (activeSockets.has(chipId)) {
      return res.json({ 
        success: true, 
        message: 'Chip já conectado',
        status: 'connected'
      });
    }

    // Criar nova conexão
    await createWhatsAppConnection(chipId);
    
    res.json({ 
      success: true, 
      message: 'Conexão iniciada, aguarde o QR Code',
      chipId,
      status: 'connecting'
    });

  } catch (error) {
    console.error('Erro ao conectar:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obter status e QR Code
app.get('/whatsapp/status', (req, res) => {
  try {
    const { chipId } = req.query;
    
    if (!chipId) {
      return res.status(400).json({ error: 'chipId é obrigatório' });
    }

    const status = sessionsCache.get(`${chipId}_status`) || 'disconnected';
    const qrCode = sessionsCache.get(`${chipId}_qr`);
    
    res.json({
      success: true,
      chipId,
      status,
      qrCode: status === 'qr_generated' ? qrCode : null
    });

  } catch (error) {
    console.error('Erro ao obter status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Enviar mensagem
app.post('/whatsapp/send-message', async (req, res) => {
  try {
    const { chipId, phone, message } = req.body;
    
    if (!chipId || !phone || !message) {
      return res.status(400).json({ error: 'chipId, phone e message são obrigatórios' });
    }

    const sock = activeSockets.get(chipId);
    
    if (!sock) {
      return res.status(400).json({ error: 'Chip não conectado' });
    }

    // Formatar número
    const formattedPhone = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`;
    
    // Enviar mensagem
    await sock.sendMessage(formattedPhone, { text: message });
    
    console.log(`Mensagem enviada para ${phone} via chip ${chipId}`);
    
    res.json({
      success: true,
      message: 'Mensagem enviada com sucesso',
      chipId,
      phone,
      sentMessage: message
    });

  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({ error: error.message });
  }
});

// Desconectar chip
app.post('/whatsapp/disconnect', (req, res) => {
  try {
    const { chipId } = req.body;
    
    if (!chipId) {
      return res.status(400).json({ error: 'chipId é obrigatório' });
    }

    const sock = activeSockets.get(chipId);
    
    if (sock) {
      sock.logout();
      activeSockets.delete(chipId);
    }

    sessionsCache.del(`${chipId}_status`);
    sessionsCache.del(`${chipId}_qr`);
    
    res.json({
      success: true,
      message: 'Chip desconectado',
      chipId
    });

  } catch (error) {
    console.error('Erro ao desconectar:', error);
    res.status(500).json({ error: error.message });
  }
});

// Status geral do servidor
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Servidor WhatsApp funcionando',
    activeConnections: activeSockets.size,
    timestamp: new Date().toISOString()
  });
});

// Nova rota para listar todas as conexões ativas
app.get('/whatsapp/connections', (req, res) => {
  try {
    const connections = Array.from(activeSockets.keys()).map(chipId => ({
      chipId,
      status: sessionsCache.get(`${chipId}_status`) || 'disconnected',
      hasQrCode: !!sessionsCache.get(`${chipId}_qr`)
    }));
    
    res.json({
      success: true,
      connections,
      total: connections.length
    });
  } catch (error) {
    console.error('Erro ao listar conexões:', error);
    res.status(500).json({ error: error.message });
  }
});

// WebSocket status endpoint
app.get('/whatsapp/ws-status', (req, res) => {
  const wsStats = {};
  wsClients.forEach((clients, chipId) => {
    wsStats[chipId] = clients.size;
  });
  
  res.json({
    success: true,
    connectedClients: Object.keys(wsStats).length,
    clientsByChip: wsStats
  });
});

server.listen(port, () => {
  console.log(`🚀 Servidor WhatsApp rodando na porta ${port}`);
  console.log(`📱 API disponível em: http://localhost:${port}`);
  console.log(`🔌 WebSocket disponível em: ws://localhost:${port}`);
  console.log(`💡 Teste com: http://localhost:${port}/health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Fechando servidor...');
  
  // Fechar WebSocket server
  wss.close();
  
  // Desconectar todos os sockets
  activeSockets.forEach((sock, chipId) => {
    console.log(`Desconectando chip: ${chipId}`);
    sock.end();
  });
  
  server.close(() => {
    console.log('Servidor fechado');
    process.exit(0);
  });
});