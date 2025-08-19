# Use Node.js 18 Alpine para menor tamanho
FROM node:18-alpine

# Instalar dependências do sistema para Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# Configurar Puppeteer para usar Chromium instalado
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Criar diretório da aplicação
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production && npm cache clean --force

# Copiar código da aplicação
COPY . .

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S whatsapp -u 1001

# Criar diretórios necessários
RUN mkdir -p /app/auth /app/logs && \
    chown -R whatsapp:nodejs /app

# Mudar para usuário não-root
USER whatsapp

# Expor porta
EXPOSE 3001

# Comando de inicialização
CMD ["npm", "start"]