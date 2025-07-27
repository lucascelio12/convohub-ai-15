import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'
import { makeWASocket, DisconnectReason, useMultiFileAuthState } from 'https://esm.sh/@whiskeysockets/baileys@6.7.8?external=sharp'
import { Boom } from 'https://esm.sh/@hapi/boom@10.0.1'
import { join } from 'https://deno.land/std@0.208.0/path/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WhatsAppSession {
  chipId: string;
  qrCode?: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'failed';
  socket?: any;
  authDir: string;
}

// Store active sessions
const sessions = new Map<string, WhatsAppSession>();

// Create sessions directory structure
const SESSIONS_DIR = '/tmp/whatsapp-sessions'
await Deno.mkdir(SESSIONS_DIR, { recursive: true })

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const url = new URL(req.url);
    const pathname = url.pathname;

    if (req.method === 'POST' && pathname.includes('/connect')) {
      const { chipId } = await req.json();
      
      console.log(`Iniciando conexão real do WhatsApp para chip: ${chipId}`);
      
      try {
        // Criar diretório de autenticação para o chip
        const authDir = join(SESSIONS_DIR, chipId)
        await Deno.mkdir(authDir, { recursive: true })
        
        // Usar Baileys para autenticação multi-arquivo
        const { state, saveCreds } = await useMultiFileAuthState(authDir)
        
        const socket = makeWASocket({
          auth: state,
          printQRInTerminal: false,
          browser: ['WA Business Manager', 'Chrome', '4.0.0'],
          defaultQueryTimeoutMs: 60000,
        })
        
        let qrCode = ''
        
        socket.ev.on('connection.update', async (update) => {
          const { connection, lastDisconnect, qr } = update
          
          if (qr) {
            qrCode = qr
            console.log(`QR Code gerado para chip ${chipId}`)
            
            // Atualizar sessão com QR code
            const session = sessions.get(chipId)
            if (session) {
              session.qrCode = qr
              session.status = 'connecting'
              sessions.set(chipId, session)
            }
          }
          
          if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
            console.log(`Conexão fechada para chip ${chipId}, reconectar:`, shouldReconnect)
            
            if (shouldReconnect) {
              // Reconectar automaticamente
              setTimeout(() => connectChip(chipId), 3000)
            } else {
              // Remover sessão se logout
              sessions.delete(chipId)
              await supabase
                .from('chips')
                .update({ status: 'disconnected' })
                .eq('id', chipId)
            }
          } else if (connection === 'open') {
            console.log(`Chip ${chipId} conectado com sucesso!`)
            
            // Atualizar status no banco
            await supabase
              .from('chips')
              .update({ status: 'active' })
              .eq('id', chipId)
              
            // Atualizar sessão
            const session = sessions.get(chipId)
            if (session) {
              session.status = 'connected'
              session.socket = socket
              sessions.set(chipId, session)
            }
          }
        })
        
        socket.ev.on('creds.update', saveCreds)
        
        const session: WhatsAppSession = {
          chipId,
          qrCode: '',
          status: 'connecting',
          socket,
          authDir
        }
        
        sessions.set(chipId, session)
        
        // Aguardar QR code ser gerado (timeout de 30 segundos)
        const startTime = Date.now()
        while (!qrCode && (Date.now() - startTime) < 30000) {
          await new Promise(resolve => setTimeout(resolve, 500))
          const currentSession = sessions.get(chipId)
          if (currentSession?.qrCode) {
            qrCode = currentSession.qrCode
            break
          }
        }
        
        if (!qrCode) {
          throw new Error('Timeout ao gerar QR code')
        }
        
        // Atualizar status no banco
        await supabase
          .from('chips')
          .update({ status: 'connecting' })
          .eq('id', chipId)
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            qrCode,
            sessionId: chipId
          }),
          { 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            } 
          }
        )
        
      } catch (error) {
        console.error(`Erro ao conectar chip ${chipId}:`, error)
        
        await supabase
          .from('chips')
          .update({ status: 'failed' })
          .eq('id', chipId)
          
        return new Response(
          JSON.stringify({ 
            error: `Erro ao conectar: ${error.message}` 
          }),
          { 
            status: 500,
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            } 
          }
        )
      }
    }

    if (req.method === 'POST' && pathname.includes('/scan')) {
      const { chipId } = await req.json()
      
      console.log(`Verificando status de scan para chip: ${chipId}`)
      
      const session = sessions.get(chipId)
      if (!session) {
        return new Response(
          JSON.stringify({ error: 'Sessão não encontrada' }),
          { 
            status: 404,
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            } 
          }
        )
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          status: session.status,
          qrCode: session.qrCode 
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }

    if (req.method === 'GET' && pathname.includes('/status')) {
      const chipId = url.searchParams.get('chipId');
      
      if (!chipId) {
        return new Response(
          JSON.stringify({ error: 'chipId é obrigatório' }),
          { 
            status: 400,
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            } 
          }
        );
      }
      
      const session = sessions.get(chipId);
      
      return new Response(
        JSON.stringify({ 
          status: session?.status || 'disconnected',
          qrCode: session?.qrCode
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    if (req.method === 'POST' && pathname.includes('/send-message')) {
      const { chipId, phone, message } = await req.json()
      
      console.log(`Enviando mensagem via chip ${chipId} para ${phone}: ${message}`)
      
      const session = sessions.get(chipId)
      
      if (!session || session.status !== 'connected' || !session.socket) {
        return new Response(
          JSON.stringify({ error: 'Chip não conectado' }),
          { 
            status: 400,
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            } 
          }
        )
      }
      
      try {
        // Formatar número do telefone
        const formattedPhone = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`
        
        // Enviar mensagem via Baileys
        const result = await session.socket.sendMessage(formattedPhone, { 
          text: message 
        })
        
        console.log(`Mensagem enviada com sucesso para ${phone}:`, result.key.id)
        
        // Atualizar contador de uso
        await supabase.rpc('increment_chip_usage', { chip_id: chipId })
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            messageId: result.key.id,
            timestamp: result.messageTimestamp 
          }),
          { 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            } 
          }
        )
        
      } catch (error) {
        console.error(`Erro ao enviar mensagem para ${phone}:`, error)
        
        return new Response(
          JSON.stringify({ 
            error: `Erro ao enviar mensagem: ${error.message}` 
          }),
          { 
            status: 500,
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            } 
          }
        )
      }
    }

    return new Response(
      JSON.stringify({ error: 'Endpoint não encontrado' }),
      { 
        status: 404,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Erro no edge function:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});

// Função auxiliar para conectar chip
async function connectChip(chipId: string) {
  console.log(`Reconectando chip: ${chipId}`)
  
  const authDir = join(SESSIONS_DIR, chipId)
  
  try {
    const { state, saveCreds } = await useMultiFileAuthState(authDir)
    
    const socket = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: ['WA Business Manager', 'Chrome', '4.0.0'],
      defaultQueryTimeoutMs: 60000,
    })
    
    // Atualizar sessão existente
    const session = sessions.get(chipId)
    if (session) {
      session.socket = socket
      session.status = 'connecting'
      sessions.set(chipId, session)
    }
    
    socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update
      
      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
        console.log(`Reconexão fechada para chip ${chipId}, reconectar:`, shouldReconnect)
        
        if (shouldReconnect) {
          setTimeout(() => connectChip(chipId), 3000)
        }
      } else if (connection === 'open') {
        console.log(`Chip ${chipId} reconectado com sucesso!`)
        
        const session = sessions.get(chipId)
        if (session) {
          session.status = 'connected'
          session.socket = socket
          sessions.set(chipId, session)
        }
      }
    })
    
    socket.ev.on('creds.update', saveCreds)
    
  } catch (error) {
    console.error(`Erro ao reconectar chip ${chipId}:`, error)
  }
}