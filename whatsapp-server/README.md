# 📱 Servidor WhatsApp com Baileys

Servidor Node.js para integração WhatsApp usando Baileys - **FUNCIONA DE VERDADE!**

## 🚀 Instalação Rápida

### 1. Instalar dependências:
```bash
cd whatsapp-server
npm install
```

### 2. Rodar o servidor:
```bash
# Desenvolvimento (com auto-reload)
npm run dev

# Produção
npm start
```

O servidor roda na porta **3001**: http://localhost:3001

## 📋 Como Usar

### 1. Conectar chip:
```bash
curl -X POST http://localhost:3001/whatsapp/connect \
  -H "Content-Type: application/json" \
  -d '{"chipId": "chip001"}'
```

### 2. Obter QR Code:
```bash
curl http://localhost:3001/whatsapp/status?chipId=chip001
```

### 3. Enviar mensagem:
```bash
curl -X POST http://localhost:3001/whatsapp/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "chipId": "chip001",
    "phone": "5511999999999",
    "message": "Olá! Teste do sistema"
  }'
```

## 🔗 Integração com o Frontend

O frontend já está configurado para usar este servidor. Apenas certifique-se de que:

1. O servidor está rodando na porta 3001
2. O CORS está liberado
3. As rotas estão acessíveis

## 📁 Estrutura de Arquivos

```
whatsapp-server/
├── package.json          # Dependências
├── server.js             # Servidor principal
├── README.md             # Este arquivo
├── auth_sessions/        # Sessões WhatsApp (criado automaticamente)
├── whatsapp.log          # Logs do sistema
└── node_modules/         # Dependências instaladas
```

## 🛠 APIs Disponíveis

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/whatsapp/connect` | Conectar chip |
| GET | `/whatsapp/status` | Status e QR Code |
| POST | `/whatsapp/send-message` | Enviar mensagem |
| POST | `/whatsapp/disconnect` | Desconectar chip |
| GET | `/health` | Status do servidor |

## ⚙️ Configuração no Frontend

Atualize o arquivo `src/services/whatsapp.ts` para usar o servidor local:

```typescript
private baseUrl = 'http://localhost:3001/whatsapp';
```

## 🔒 Segurança para Produção

Para usar em produção:

1. Configure HTTPS
2. Adicione autenticação JWT
3. Use variáveis de ambiente
4. Configure firewall
5. Use PM2 para gerenciar processos

## 📱 Como Funciona

1. **Conectar**: Cria sessão WhatsApp usando Baileys
2. **QR Code**: Gera QR Code real do WhatsApp
3. **Scanner**: Use WhatsApp do celular para escanear
4. **Enviar**: Envia mensagens reais pelo WhatsApp

## 🚨 Importante

- **Cada chip precisa de um número WhatsApp diferente**
- **Mantenha o WhatsApp do celular sempre online**
- **Não use WhatsApp Web simultaneamente**
- **Sessões são salvas automaticamente**

## 🐛 Troubleshooting

### Erro de conexão:
```bash
# Verificar se o servidor está rodando
curl http://localhost:3001/health
```

### QR Code não aparece:
- Aguarde alguns segundos após conectar
- Verifique os logs no terminal
- Tente desconectar e conectar novamente

### Mensagem não envia:
- Verifique se o chip está conectado
- Confirme o formato do número (com código do país)
- Teste com um número válido

## 📞 Suporte

Se tiver problemas:
1. Verifique os logs no terminal
2. Confirme que todas as dependências estão instaladas
3. Teste as APIs individualmente com curl