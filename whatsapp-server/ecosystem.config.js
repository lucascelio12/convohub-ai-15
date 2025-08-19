module.exports = {
  apps: [{
    name: 'whatsapp-server',
    script: 'server.js',
    instances: 1, // Não usar cluster mode com whatsapp-web.js
    autorestart: true,
    watch: false,
    max_memory_restart: '2G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    log_type: 'json',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    // Configurações específicas para WhatsApp
    kill_timeout: 10000,
    listen_timeout: 10000,
    shutdown_with_message: true,
    wait_ready: true,
    // Reiniciar se usar muita CPU
    max_restarts: 10,
    min_uptime: '10s'
  }]
};