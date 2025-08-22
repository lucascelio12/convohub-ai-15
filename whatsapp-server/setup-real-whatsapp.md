# Configuração do Servidor WhatsApp Real

Este guia mostra como configurar o servidor para gerar QR codes **REAIS** do WhatsApp que funcionam de verdade.

## 🚀 Configuração Rápida

### 1. Instalar Dependências

```bash
cd whatsapp-server
npm install
```

### 2. Atualizar server.js para WhatsApp Real

Substitua o conteúdo do `server.js` por:

```javascript
const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Armazenar clientes WhatsApp ativos
const clients = new Map();
const qrCodes = new Map();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Endpoint para iniciar conexão WhatsApp
app.post('/whatsapp/connect', async (req, res) => {
  const { chipId } = req.body;

  if (!chipId) {
    return res.status(400).json({ error: 'chipId é obrigatório' });
  }

  try {
    // Se já existe um cliente para este chip, destruir primeiro
    if (clients.has(chipId)) {
      const existingClient = clients.get(chipId);
      await existingClient.destroy();
      clients.delete(chipId);
      qrCodes.delete(chipId);
    }

    // Criar novo cliente WhatsApp
    const client = new Client({
      authStrategy: new LocalAuth({ clientId: chipId }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      }
    });

    // Event: QR Code gerado
    client.on('qr', async (qr) => {
      console.log(`QR Code gerado para chip ${chipId}`);
      
      try {
        // Gerar QR code como imagem base64
        const qrImageUrl = await qrcode.toDataURL(qr, {
          errorCorrectionLevel: 'M',
          type: 'image/png',
          quality: 0.92,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          },
          width: 256
        });

        qrCodes.set(chipId, qrImageUrl);

        // Notificar via WebSocket
        io.emit('qr_updated', {
          chipId,
          qrCode: qrImageUrl,
          status: 'qr_ready'
        });

        console.log(`QR Code pronto para chip ${chipId}`);
      } catch (error) {
        console.error(`Erro ao gerar QR code para chip ${chipId}:`, error);
      }
    });

    // Event: Cliente autenticado
    client.on('authenticated', () => {
      console.log(`Chip ${chipId} autenticado com sucesso`);
      qrCodes.delete(chipId); // Remover QR code após autenticação
      
      io.emit('status_updated', {
        chipId,
        status: 'authenticated'
      });
    });

    // Event: Cliente pronto
    client.on('ready', () => {
      console.log(`Chip ${chipId} conectado e pronto!`);
      
      io.emit('status_updated', {
        chipId,
        status: 'connected',
        isReady: true
      });
    });

    // Event: Falha na autenticação
    client.on('auth_failure', (msg) => {
      console.error(`Falha na autenticação do chip ${chipId}:`, msg);
      qrCodes.delete(chipId);
      
      io.emit('status_updated', {
        chipId,
        status: 'error',
        error: msg
      });
    });

    // Event: Cliente desconectado
    client.on('disconnected', (reason) => {
      console.log(`Chip ${chipId} desconectado:`, reason);
      clients.delete(chipId);
      qrCodes.delete(chipId);
      
      io.emit('status_updated', {
        chipId,
        status: 'disconnected'
      });
    });

    // Armazenar cliente
    clients.set(chipId, client);

    // Inicializar cliente
    await client.initialize();

    res.json({
      success: true,
      chipId,
      status: 'connecting',
      message: 'Processo de conexão iniciado'
    });

  } catch (error) {
    console.error(`Erro ao conectar chip ${chipId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para obter status e QR code
app.get('/whatsapp/status', (req, res) => {
  const { chipId } = req.query;

  if (!chipId) {
    return res.status(400).json({ error: 'chipId é obrigatório' });
  }

  const client = clients.get(chipId);
  const qrCode = qrCodes.get(chipId);

  let status = 'disconnected';
  
  if (client) {
    const state = client.getState();
    switch (state) {
      case 'CONNECTED':
        status = 'connected';
        break;
      case 'OPENING':
        status = 'connecting';
        break;
      case 'PAIRING':
        status = qrCode ? 'qr_ready' : 'connecting';
        break;
      default:
        status = 'disconnected';
    }
  }

  res.json({
    chipId,
    status,
    qrCode: qrCode || null,
    hasQrCode: !!qrCode,
    isReady: status === 'connected'
  });
});

// Endpoint para desconectar
app.post('/whatsapp/disconnect', async (req, res) => {
  const { chipId } = req.body;

  if (!chipId) {
    return res.status(400).json({ error: 'chipId é obrigatório' });
  }

  try {
    const client = clients.get(chipId);
    
    if (client) {
      await client.destroy();
      clients.delete(chipId);
      qrCodes.delete(chipId);
      
      io.emit('status_updated', {
        chipId,
        status: 'disconnected'
      });
    }

    res.json({
      success: true,
      chipId,
      status: 'disconnected'
    });

  } catch (error) {
    console.error(`Erro ao desconectar chip ${chipId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para enviar mensagem
app.post('/whatsapp/send-message', async (req, res) => {
  const { chipId, phone, message } = req.body;

  if (!chipId || !phone || !message) {
    return res.status(400).json({ error: 'chipId, phone e message são obrigatórios' });
  }

  try {
    const client = clients.get(chipId);
    
    if (!client) {
      return res.status(400).json({ error: 'Chip não conectado' });
    }

    const state = client.getState();
    if (state !== 'CONNECTED') {
      return res.status(400).json({ error: 'Chip não está pronto para enviar mensagens' });
    }

    // Formatar número
    const phoneNumber = phone.includes('@c.us') ? phone : `${phone}@c.us`;
    
    // Enviar mensagem
    const result = await client.sendMessage(phoneNumber, message);

    res.json({
      success: true,
      chipId,
      messageId: result.id._serialized,
      phone,
      message
    });

  } catch (error) {
    console.error(`Erro ao enviar mensagem via chip ${chipId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para listar conexões
app.get('/whatsapp/connections', (req, res) => {
  const connections = [];
  
  for (const [chipId, client] of clients.entries()) {
    const qrCode = qrCodes.get(chipId);
    const state = client.getState();
    
    let status = 'disconnected';
    switch (state) {
      case 'CONNECTED':
        status = 'connected';
        break;
      case 'OPENING':
        status = 'connecting';
        break;
      case 'PAIRING':
        status = qrCode ? 'qr_ready' : 'connecting';
        break;
    }

    connections.push({
      chipId,
      status,
      hasQrCode: !!qrCode,
      isReady: status === 'connected',
      lastSeen: new Date().toISOString()
    });
  }

  res.json({ connections });
});

// WebSocket connection
io.on('connection', (socket) => {
  console.log('Cliente conectado via WebSocket');

  socket.on('disconnect', () => {
    console.log('Cliente desconectado do WebSocket');
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Servidor WhatsApp rodando na porta ${PORT}`);
  console.log(`📱 QR codes reais serão gerados automaticamente`);
  console.log(`🌐 WebSocket disponível para atualizações em tempo real`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Encerrando servidor...');
  
  // Desconectar todos os clientes
  for (const [chipId, client] of clients.entries()) {
    try {
      await client.destroy();
      console.log(`Cliente ${chipId} desconectado`);
    } catch (error) {
      console.error(`Erro ao desconectar cliente ${chipId}:`, error);
    }
  }
  
  process.exit(0);
});
```

### 3. Iniciar o Servidor

```bash
cd whatsapp-server
npm start
```

## ✅ Como Funciona

### **Produção (Edge Function)**
- QR codes reais via Supabase Edge Function
- WebSocket para atualizações em tempo real
- Totalmente serverless

### **Local (Servidor Node.js)**
- QR codes **REAIS** do WhatsApp Web
- Biblioteca `whatsapp-web.js` oficial
- Sessões persistentes com `LocalAuth`

### **Desenvolvimento (Simulado)**
- QR codes visuais via API externa
- Processo completo simulado
- Não requer servidor WhatsApp

## 🔄 Fluxo de Conexão

1. **Conectar**: `connecting` (2s)
2. **QR Gerado**: `qr_ready` + QR code real
3. **Scan no App**: Status muda para `authenticated`
4. **Pronto**: `connected` - pode enviar mensagens

## 🛠️ Teste

1. Inicie o servidor: `npm start`
2. Acesse `/chips` no app
3. Clique em "Conectar" em qualquer chip
4. Aguarde o QR code aparecer
5. Escaneie com WhatsApp do celular
6. Status mudará para "Conectado"

**Agora os QR codes são REAIS e funcionam com WhatsApp!** 🎉