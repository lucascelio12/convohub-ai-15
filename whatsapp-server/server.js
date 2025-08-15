const express = require('express');
const cors = require('cors');
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const P = require('pino');
const QRCode = require('qrcode');
const NodeCache = require('node-cache');

const app = express();
const port = 3001;

// Cache para sessões ativas
const sessionsCache = new NodeCache({ stdTTL: 600 }); // 10 minutos
const activeSockets = new Map();

app.use(cors());
app.use(express.json());

// Logger
const logger = P({ timestamp: () => `,"time":"${new Date().toJSON()}"` }, P.destination('./whatsapp.log'));

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
        console.log(`QR Code gerado para ${chipId}`);
      }
      
      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log('Conexão fechada, reconectando...', shouldReconnect);
        
        sessionsCache.set(`${chipId}_status`, 'disconnected');
        activeSockets.delete(chipId);
        
        if (shouldReconnect) {
          setTimeout(() => createWhatsAppConnection(chipId), 3000);
        }
      } else if (connection === 'open') {
        console.log(`WhatsApp conectado para chip: ${chipId}`);
        sessionsCache.set(`${chipId}_status`, 'connected');
        activeSockets.set(chipId, sock);
      }
    });

    sock.ev.on('creds.update', saveCreds);
    
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

app.listen(port, () => {
  console.log(`🚀 Servidor WhatsApp rodando na porta ${port}`);
  console.log(`📱 API disponível em: http://localhost:${port}`);
  console.log(`💡 Teste com: http://localhost:${port}/health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Fechando servidor...');
  
  // Desconectar todos os sockets
  activeSockets.forEach((sock, chipId) => {
    console.log(`Desconectando chip: ${chipId}`);
    sock.end();
  });
  
  process.exit(0);
});