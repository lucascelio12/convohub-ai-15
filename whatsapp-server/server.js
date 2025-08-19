const express = require('express');
const cors = require('cors');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const { Server } = require('socket.io');
const http = require('http');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const cron = require('node-cron');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configurações
const PORT = process.env.PORT || 3001;
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:5173/api/webhook';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uncjxmnfdidrkakpasjy.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuY2p4bW5mZGlkcmtha3Bhc2p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0NTMwMTEsImV4cCI6MjA3MTAyOTAxMX0.FHhiMkmRS-jNOqaTZu3J-LAX7bmLxQu8XKytEUz0roY';

// Storage para múltiplas sessões
const sessions = new Map();
const qrCodes = new Map();
const connectionStatus = new Map();

// Classe para gerenciar sessões WhatsApp
class WhatsAppManager {
  constructor(chipId) {
    this.chipId = chipId;
    this.client = null;
    this.isReady = false;
    this.qrCode = null;
    this.status = 'disconnected';
    this.lastSeen = new Date();
    this.authDir = path.join(__dirname, 'auth', chipId);
  }

  async initialize() {
    try {
      console.log(`[${this.chipId}] Inicializando cliente WhatsApp...`);
      
      await fs.ensureDir(this.authDir);

      this.client = new Client({
        authStrategy: new LocalAuth({
          clientId: this.chipId,
          dataPath: this.authDir
        }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
          ]
        }
      });

      this.setupEventHandlers();
      await this.client.initialize();
      
    } catch (error) {
      console.error(`[${this.chipId}] Erro ao inicializar:`, error);
      this.updateStatus('error');
      throw error;
    }
  }

  setupEventHandlers() {
    this.client.on('qr', async (qr) => {
      console.log(`[${this.chipId}] QR Code gerado`);
      try {
        this.qrCode = await QRCode.toDataURL(qr);
        qrCodes.set(this.chipId, this.qrCode);
        this.updateStatus('qr_ready');
        
        io.emit('qr_updated', { 
          chipId: this.chipId, 
          qrCode: this.qrCode,
          status: 'qr_ready'
        });

      } catch (error) {
        console.error(`[${this.chipId}] Erro ao gerar QR:`, error);
      }
    });

    this.client.on('ready', async () => {
      console.log(`[${this.chipId}] Cliente pronto!`);
      this.isReady = true;
      this.qrCode = null;
      qrCodes.delete(this.chipId);
      this.updateStatus('connected');
      
      io.emit('status_updated', {
        chipId: this.chipId,
        status: 'connected',
        phone: this.client.info?.wid?.user
      });
    });

    this.client.on('disconnected', async (reason) => {
      console.log(`[${this.chipId}] Desconectado:`, reason);
      this.isReady = false;
      this.updateStatus('disconnected');
      
      io.emit('status_updated', {
        chipId: this.chipId,
        status: 'disconnected',
        reason
      });

      setTimeout(() => this.initialize(), 10000);
    });

    this.client.on('message', async (message) => {
      try {
        const messageData = {
          id: message.id._serialized,
          chipId: this.chipId,
          from: message.from,
          body: message.body,
          timestamp: message.timestamp
        };

        console.log(`[${this.chipId}] Nova mensagem de ${message.from}: ${message.body}`);
        io.emit('message_received', messageData);
      } catch (error) {
        console.error(`[${this.chipId}] Erro ao processar mensagem:`, error);
      }
    });
  }

  updateStatus(status) {
    this.status = status;
    this.lastSeen = new Date();
    connectionStatus.set(this.chipId, {
      status,
      lastSeen: this.lastSeen,
      isReady: this.isReady
    });
  }

  async sendMessage(to, message) {
    if (!this.isReady) {
      throw new Error('Cliente não está pronto');
    }
    return await this.client.sendMessage(to, message);
  }

  async disconnect() {
    if (this.client) {
      await this.client.destroy();
      this.client = null;
    }
    this.isReady = false;
    this.updateStatus('disconnected');
    sessions.delete(this.chipId);
    qrCodes.delete(this.chipId);
    connectionStatus.delete(this.chipId);
  }
}

// API Routes
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'WhatsApp Server rodando',
    activeSessions: sessions.size,
    timestamp: new Date().toISOString()
  });
});

app.post('/whatsapp/connect', async (req, res) => {
  try {
    const { chipId } = req.body;
    
    if (!chipId) {
      return res.status(400).json({ error: 'chipId é obrigatório' });
    }

    if (sessions.has(chipId)) {
      const session = sessions.get(chipId);
      if (session.isReady) {
        return res.json({
          success: true,
          message: 'Chip já está conectado',
          status: 'connected'
        });
      }
    }

    const manager = new WhatsAppManager(chipId);
    sessions.set(chipId, manager);
    
    manager.initialize().catch(error => {
      console.error(`Erro ao inicializar ${chipId}:`, error);
    });

    res.json({
      success: true,
      message: 'Conexão iniciada',
      status: 'connecting'
    });
    
  } catch (error) {
    console.error('Erro ao conectar:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/whatsapp/status', (req, res) => {
  try {
    const { chipId } = req.query;
    
    if (!chipId) {
      return res.status(400).json({ error: 'chipId é obrigatório' });
    }

    const session = sessions.get(chipId);
    const qrCode = qrCodes.get(chipId);
    const status = connectionStatus.get(chipId) || { status: 'disconnected', isReady: false };

    res.json({
      success: true,
      chipId,
      status: status.status,
      isReady: status.isReady,
      qrCode: qrCode || null
    });
    
  } catch (error) {
    console.error('Erro ao obter status:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/whatsapp/connections', (req, res) => {
  try {
    const connections = Array.from(sessions.keys()).map(chipId => {
      const session = sessions.get(chipId);
      const qrCode = qrCodes.get(chipId);
      const status = connectionStatus.get(chipId) || { status: 'disconnected', isReady: false };
      
      return {
        chipId,
        status: status.status,
        isReady: status.isReady,
        hasQrCode: !!qrCode
      };
    });

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

app.post('/whatsapp/send-message', async (req, res) => {
  try {
    const { chipId, to, message } = req.body;
    
    if (!chipId || !to || !message) {
      return res.status(400).json({ 
        error: 'chipId, to e message são obrigatórios' 
      });
    }

    const session = sessions.get(chipId);
    if (!session || !session.isReady) {
      return res.status(400).json({ 
        error: 'Chip não está conectado' 
      });
    }

    const sentMessage = await session.sendMessage(to, message);
    
    res.json({
      success: true,
      message: 'Mensagem enviada'
    });
    
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/whatsapp/disconnect', async (req, res) => {
  try {
    const { chipId } = req.body;
    
    if (!chipId) {
      return res.status(400).json({ error: 'chipId é obrigatório' });
    }

    const session = sessions.get(chipId);
    if (session) {
      await session.disconnect();
    }

    res.json({
      success: true,
      message: 'Chip desconectado'
    });
    
  } catch (error) {
    console.error('Erro ao desconectar:', error);
    res.status(500).json({ error: error.message });
  }
});

// WebSocket para atualizações em tempo real
io.on('connection', (socket) => {
  console.log('Cliente WebSocket conectado:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Cliente WebSocket desconectado:', socket.id);
  });
});

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`🚀 WhatsApp Server rodando na porta ${PORT}`);
  console.log(`📱 WebSocket disponível para atualizações em tempo real`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Encerrando servidor...');
  
  for (const [chipId, session] of sessions.entries()) {
    console.log(`Desconectando ${chipId}...`);
    await session.disconnect();
  }
  
  process.exit(0);
});