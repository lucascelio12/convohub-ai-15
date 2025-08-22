# WhatsApp Server - Desenvolvimento

## 🚀 Como usar em desenvolvimento

### Opção 1: Servidor Real (Recomendado para produção)

1. **Instalar dependências:**
```bash
cd whatsapp-server
npm install
```

2. **Configurar ambiente:**
```bash
cp .env.example .env
# Editar .env com suas configurações
```

3. **Rodar servidor:**
```bash
npm run dev
```

4. **Verificar se está funcionando:**
```bash
curl http://localhost:3001/health
```

### Opção 2: Modo Simulado (Para desenvolvimento sem servidor)

Se o servidor WhatsApp não estiver rodando, o frontend automaticamente entra em **modo simulado**:

✅ **O que funciona no modo simulado:**
- Conexão de chips (simula o processo real)
- Geração de QR codes visuais
- Estados: `connecting` → `qr_ready` → `connected`
- Desconexão de chips
- Interface completa do frontend

🔄 **Fluxo simulado:**
1. Clica "Conectar" → Status muda para `connecting`
2. Após 2s → Status muda para `qr_ready` + QR code disponível
3. Após 10s → Status muda para `connected`

## 📱 Como testar conexão real

1. **Rodar servidor WhatsApp:**
```bash
cd whatsapp-server
npm run dev
```

2. **Ver logs do servidor** para debug

3. **No frontend**, clique "Conectar" em um chip

4. **QR Code real** será gerado automaticamente

5. **Escanear** com WhatsApp no celular

6. **Status atualiza** em tempo real via WebSocket

## 🐛 Debug

### Logs importantes:
```bash
# Console do navegador
"Servidor WhatsApp disponível"  # ✅ Servidor conectado
"Simulando conexão do chip"     # ⚠️ Modo simulado

# Servidor WhatsApp
"[CHIP_ID] QR Code gerado"      # ✅ QR real gerado
"[CHIP_ID] Cliente pronto!"     # ✅ Conexão estabelecida
```

### Endpoints úteis:
- `GET /health` - Verificar se servidor está vivo
- `GET /whatsapp/connections` - Ver todas conexões
- `POST /whatsapp/connect` - Conectar chip
- `GET /whatsapp/status?chipId=X` - Status de um chip

## 🔧 Configurações

### Frontend automaticamente:
- Detecta se servidor está disponível
- Usa servidor real se disponível
- Usa modo simulado se servidor offline
- WebSocket em tempo real quando servidor ativo

### Servidor:
- Porta padrão: `3001`
- WebSocket integrado
- Suporte a múltiplos chips
- Persistência de sessões