import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WhatsAppSession {
  chipId: string;
  qrCode?: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'failed';
  authDir: string;
}

// Store active sessions
const sessions = new Map<string, WhatsAppSession>();

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
      
      console.log(`Gerando QR code para chip: ${chipId}`);
      
      try {
        // Gerar QR code simples (simulado por enquanto)
        const timestamp = Date.now();
        const qrCode = `1@${chipId.replace(/-/g, '').substring(0, 10)},${chipId},${timestamp}`;
        
        const session: WhatsAppSession = {
          chipId,
          qrCode,
          status: 'connecting',
          authDir: `/tmp/whatsapp-sessions/${chipId}`
        }
        
        sessions.set(chipId, session);
        
        // Atualizar status no banco
        await supabase
          .from('chips')
          .update({ status: 'connecting' })
          .eq('id', chipId)
        
        console.log(`QR code gerado para chip ${chipId}: ${qrCode}`);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            qrCode,
            sessionId: `client_${chipId}_${timestamp}`
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
      
      // Simular scan bem-sucedido após 30 segundos
      const sessionAge = Date.now() - parseInt(session.qrCode?.split(',')[2] || '0');
      if (sessionAge > 30000) {
        session.status = 'connected';
        sessions.set(chipId, session);
        
        await supabase
          .from('chips')
          .update({ status: 'active' })
          .eq('id', chipId)
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
      
      if (!session || session.status !== 'connected') {
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
        // Simular envio de mensagem
        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        console.log(`Mensagem enviada com sucesso para ${phone}: ${messageId}`)
        
        // Atualizar contador de uso
        await supabase.rpc('increment_chip_usage', { chip_id: chipId })
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            messageId,
            timestamp: Date.now()
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