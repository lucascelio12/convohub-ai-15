# WhatsApp Server

Servidor Node.js para gerenciar múltiplas conexões WhatsApp usando whatsapp-web.js.

## 🚀 Funcionalidades

- **Múltiplas Sessões**: Suporte a múltiplos chips WhatsApp simultaneamente
- **QR Code Real**: Geração de QR code real do WhatsApp Web
- **Tempo Real**: WebSocket para atualizações de status e mensagens
- **Webhook**: Sistema de webhook para receber mensagens
- **Auto Reconnect**: Reconexão automática em caso de queda
- **Persistência**: Sessões mantidas entre reinicializações
- **Mídia**: Suporte para envio e recebimento de arquivos

## 📦 Instalação

```bash
cd whatsapp-server
npm install
```

## ⚙️ Configuração

1. Copie o arquivo de exemplo:
```bash
cp .env.example .env
```

2. Configure as variáveis no arquivo `.env`:
```env
PORT=3001
WEBHOOK_URL=http://localhost:5173/api/webhook
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua-chave-supabase
```

## 🏃‍♂️ Execução

### Desenvolvimento
```bash
npm run dev
```

### Produção
```bash
npm start
```

## 📡 API Endpoints

### POST /whatsapp/connect
Conecta um novo chip WhatsApp
```json
{
  "chipId": "chip-001"
}
```

### GET /whatsapp/status?chipId=chip-001
Obtém status e QR code de um chip

### GET /whatsapp/connections
Lista todas as conexões ativas

### POST /whatsapp/send-message
Envia mensagem via chip específico
```json
{
  "chipId": "chip-001",
  "to": "5511999999999@c.us",
  "message": "Olá! Mensagem enviada via API"
}
```

### POST /whatsapp/disconnect
Desconecta um chip
```json
{
  "chipId": "chip-001"
}
```

## 🔌 WebSocket Events

O servidor emite os seguintes eventos via WebSocket:

- `qr_updated` - Novo QR code disponível
- `status_updated` - Status de conexão alterado
- `message_received` - Nova mensagem recebida
- `message_status` - Status de entrega alterado
- `connections_status` - Status de todas as conexões

## 📱 Conectar no Frontend

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3001');

socket.on('qr_updated', (data) => {
  console.log('QR Code:', data.qrCode);
});

socket.on('message_received', (data) => {
  console.log('Nova mensagem:', data);
});
```

## 🐳 Docker (Opcional)

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3001
CMD ["npm", "start"]
```

## 📂 Estrutura de Arquivos

```
whatsapp-server/
├── server.js           # Servidor principal
├── package.json        # Dependências
├── .env.example       # Exemplo de configuração
├── auth/              # Dados de autenticação (criado automaticamente)
└── README.md          # Esta documentação
```

## 🔧 Desenvolvimento

### Logs
O servidor gera logs detalhados para debugging:
```bash
[chip-001] Inicializando cliente WhatsApp...
[chip-001] QR Code gerado
[chip-001] Cliente pronto!
[chip-001] Nova mensagem de 5511999999999@c.us: Olá!
```

### Reconexão Automática
- Reconexão automática em caso de falhas
- Limpeza de sessões inativas a cada 30 minutos
- Persistência de dados de autenticação

### Webhook Integration
Configure o `WEBHOOK_URL` para receber eventos:
```json
{
  "event": "message_received",
  "chipId": "chip-001",
  "data": {
    "from": "5511999999999@c.us",
    "body": "Mensagem recebida",
    "timestamp": 1640995200
  }
}
```

## 🚨 Importante

1. **Dependências do Sistema**: O whatsapp-web.js requer Chrome/Chromium
2. **Memória**: Cada sessão usa ~100-200MB de RAM
3. **Armazenamento**: Dados de auth são salvos em `./auth/`
4. **Firewall**: Certifique-se que a porta está aberta
5. **SSL**: Para produção, use HTTPS

## 🆘 Troubleshooting

### QR Code não aparece
- Verifique se o Chrome está instalado
- Limpe a pasta `auth/chipId`
- Restart o servidor

### Desconexões frequentes
- Verifique conexão com internet
- Aumentar timeout no .env
- Verificar logs para erros específicos

### Mensagens não chegam
- Verificar webhook URL
- Testar conectividade com Supabase
- Validar permissões de CORS