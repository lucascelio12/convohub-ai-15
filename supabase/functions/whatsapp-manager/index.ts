import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WhatsAppSession {
  chipId: string;
  qrCode?: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'failed';
  clientId?: string;
}

// Store sessions in memory (in production, use Redis or similar)
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
      
      console.log(`Iniciando conexão para chip: ${chipId}`);
      
      // Simular geração de QR code real do WhatsApp
      const qrCode = generateWhatsAppQR(chipId);
      
      const session: WhatsAppSession = {
        chipId,
        qrCode,
        status: 'connecting',
        clientId: `client_${chipId}_${Date.now()}`
      };
      
      sessions.set(chipId, session);
      
      // Atualizar status no banco
      await supabase
        .from('chips')
        .update({ status: 'connecting' })
        .eq('id', chipId);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          qrCode,
          sessionId: session.clientId
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    if (req.method === 'POST' && pathname.includes('/scan')) {
      const { chipId } = await req.json();
      
      console.log(`Simulando scan do QR para chip: ${chipId}`);
      
      const session = sessions.get(chipId);
      if (session) {
        session.status = 'connected';
        
        // Atualizar status no banco
        await supabase
          .from('chips')
          .update({ status: 'active' })
          .eq('id', chipId);
        
        // Simular delay de conexão
        setTimeout(async () => {
          console.log(`Chip ${chipId} conectado com sucesso`);
        }, 2000);
      }
      
      return new Response(
        JSON.stringify({ success: true, status: 'connected' }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
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
      const { chipId, phone, message } = await req.json();
      
      console.log(`Enviando mensagem via chip ${chipId} para ${phone}: ${message}`);
      
      const session = sessions.get(chipId);
      
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
        );
      }
      
      // Aqui você integraria com a biblioteca real do WhatsApp
      console.log(`Mensagem enviada com sucesso para ${phone}`);
      
      // Atualizar contador de uso
      await supabase.rpc('increment_chip_usage', { chip_id: chipId });
      
      return new Response(
        JSON.stringify({ success: true, messageId: `msg_${Date.now()}` }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
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

function generateWhatsAppQR(chipId: string): string {
  // Simular formato real de QR do WhatsApp Web
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const whatsappData = `1@${randomString},${chipId},${timestamp}`;
  
  // Em produção, você geraria um QR code real aqui
  // Por enquanto, retornamos dados que podem ser convertidos em QR
  return whatsappData;
}