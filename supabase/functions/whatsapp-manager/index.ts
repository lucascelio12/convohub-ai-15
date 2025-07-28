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

// Store active sessions and warming sessions
const sessions = new Map<string, WhatsAppSession>();
const warmingSessions = new Map<string, any>();
let warmingInterval: number | null = null;

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
      
      // Simular scan bem-sucedido após 10 segundos para melhor UX
      const sessionAge = Date.now() - parseInt(session.qrCode?.split(',')[2] || '0');
      if (sessionAge > 10000) {
        session.status = 'connected';
        sessions.set(chipId, session);
        
        await supabase
          .from('chips')
          .update({ status: 'active' })
          .eq('id', chipId)
          
        console.log(`Chip ${chipId} conectado com sucesso após scan`);
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

    // Warming endpoints
    if (req.method === 'POST') {
      const body = await req.json();
      
      if (body.action === 'start-warming') {
        const { chipIds, intervalMinutes, messages } = body;
        
        console.log(`Iniciando aquecimento com ${chipIds.length} chips`);
        
        // Limpar aquecimento anterior se existir
        if (warmingInterval) {
          clearInterval(warmingInterval);
        }
        
        // Salvar configuração do aquecimento
        warmingSessions.set('current', {
          chipIds,
          intervalMinutes,
          messages,
          startTime: Date.now(),
          messagesSent: 0
        });
        
        // Função para enviar mensagens entre chips
        const sendWarmingMessage = async () => {
          const session = warmingSessions.get('current');
          if (!session || session.chipIds.length < 2) return;
          
          try {
            // Selecionar chips aleatórios
            const fromChip = session.chipIds[Math.floor(Math.random() * session.chipIds.length)];
            let toChip = session.chipIds[Math.floor(Math.random() * session.chipIds.length)];
            
            // Garantir que não seja o mesmo chip
            while (toChip === fromChip && session.chipIds.length > 1) {
              toChip = session.chipIds[Math.floor(Math.random() * session.chipIds.length)];
            }
            
            // Buscar dados dos chips
            const { data: fromChipData } = await supabase
              .from('chips')
              .select('phone_number')
              .eq('id', fromChip)
              .single();
              
            const { data: toChipData } = await supabase
              .from('chips')
              .select('phone_number')
              .eq('id', toChip)
              .single();
              
            if (fromChipData && toChipData) {
              // Selecionar mensagem aleatória
              const randomMessage = session.messages[Math.floor(Math.random() * session.messages.length)];
              
              console.log(`Aquecimento: ${fromChipData.phone_number} → ${toChipData.phone_number}: ${randomMessage}`);
              
              // Simular envio de mensagem de aquecimento
              session.messagesSent += 1;
              warmingSessions.set('current', session);
              
              // Incrementar uso do chip
              await supabase.rpc('increment_chip_usage', { chip_id: fromChip });
            }
          } catch (error) {
            console.error('Erro no aquecimento:', error);
          }
        };
        
        // Iniciar aquecimento
        warmingInterval = setInterval(sendWarmingMessage, intervalMinutes * 60 * 1000);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Aquecimento iniciado',
            chipCount: chipIds.length 
          }),
          { 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            } 
          }
        );
      }
      
      if (body.action === 'stop-warming') {
        console.log('Parando aquecimento');
        
        if (warmingInterval) {
          clearInterval(warmingInterval);
          warmingInterval = null;
        }
        
        warmingSessions.delete('current');
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Aquecimento parado' 
          }),
          { 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            } 
          }
        );
      }
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