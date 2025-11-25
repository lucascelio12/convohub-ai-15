import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const event = await req.json();
    console.log('📩 Webhook Evolution API:', JSON.stringify(event, null, 2));

    const { instance, data } = event;

    switch (event.event) {
      case 'messages.upsert':
        await handleNewMessage(supabase, instance, data);
        break;
        
      case 'connection.update':
        await handleConnectionUpdate(supabase, instance, data);
        break;
        
      case 'qrcode.updated':
        await handleQRUpdate(supabase, instance, data);
        break;

      case 'messages.set':
        console.log('📨 Messages set (histórico)', instance);
        break;
        
      default:
        console.log('ℹ️ Evento não tratado:', event.event);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleNewMessage(supabase: any, instance: string, data: any) {
  console.log('📨 Nova mensagem recebida:', instance);
  
  const message = data.messages?.[0];
  if (!message) return;

  // Ignora mensagens enviadas por nós (comentado temporariamente para testes)
  // if (message.key.fromMe) {
  //   console.log('⏭️ Mensagem enviada por nós, ignorando');
  //   return;
  // }
  
  console.log('📩 Processando mensagem. FromMe:', message.key.fromMe);

  // Encontrar chip pela instância (chipId) incluindo assigned_to
  const { data: chip, error: chipError } = await supabase
    .from('chips')
    .select('id, company_id, queue_id, assigned_to')
    .or(`id.eq.${instance},evolution_instance_id.eq.${instance}`)
    .single();
    
  if (chipError || !chip) {
    console.error('❌ Chip não encontrado:', instance, chipError);
    return;
  }

  const phoneNumber = message.key.remoteJid
    .replace('@s.whatsapp.net', '')
    .replace('@lid', '')
    .split(':')[0]; // Remove formato lid com : se houver
  
  // Roteamento inteligente: assigned_to tem prioridade sobre queue_id
  const assignedTo = chip.assigned_to || null;
  const queueId = chip.assigned_to ? null : chip.queue_id; // Se tem assigned_to, não usa fila
  
  console.log('🔀 Roteamento:', { 
    assigned_to: assignedTo, 
    queue_id: queueId,
    strategy: assignedTo ? 'atendente_direto' : 'fila' 
  });
  
  // Criar ou buscar conversa
  const conversationId = await getOrCreateConversation(
    supabase, 
    chip.id,
    chip.company_id,
    queueId,
    phoneNumber,
    message.pushName,
    assignedTo
  );
  
  // Extrair conteúdo da mensagem
  const content = extractMessageContent(message);
  const messageType = getMessageType(message);
  
  // Salvar mensagem no banco
  const { error: msgError } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    content: content,
    sender_type: 'customer',
    message_type: messageType,
    created_at: new Date(message.messageTimestamp * 1000).toISOString()
  });

  if (msgError) {
    console.error('❌ Erro ao salvar mensagem:', msgError);
    return;
  }

  // Atualizar última mensagem da conversa
  await supabase
    .from('conversations')
    .update({ 
      last_message_at: new Date(message.messageTimestamp * 1000).toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', conversationId);

  console.log('✅ Mensagem salva:', conversationId);

  // TODO: Executar bot flows se habilitado
  await executeAutomations(supabase, conversationId, content, chip.id);
}

async function handleConnectionUpdate(supabase: any, instance: string, data: any) {
  const status = data.state;
  console.log('🔌 Atualização de conexão:', instance, status);
  
  const mappedStatus = mapEvolutionStatus(status);
  
  const { error } = await supabase
    .from('chips')
    .update({ 
      status: mappedStatus,
      updated_at: new Date().toISOString()
    })
    .or(`id.eq.${instance},evolution_instance_id.eq.${instance}`);

  if (error) {
    console.error('❌ Erro ao atualizar status do chip:', error);
  } else {
    console.log('✅ Status atualizado:', instance, mappedStatus);
  }
}

async function handleQRUpdate(supabase: any, instance: string, data: any) {
  console.log('📱 QR Code atualizado:', instance);
  
  const { error } = await supabase
    .from('chips')
    .update({ 
      qr_code: data.qrcode?.base64 || data.qr,
      status: 'waiting_qr',
      updated_at: new Date().toISOString()
    })
    .or(`id.eq.${instance},evolution_instance_id.eq.${instance}`);

  if (error) {
    console.error('❌ Erro ao atualizar QR:', error);
  } else {
    console.log('✅ QR Code salvo');
  }
}

function mapEvolutionStatus(evolutionStatus: string): string {
  const mapping: Record<string, string> = {
    'connecting': 'connecting',
    'open': 'connected',
    'close': 'disconnected',
    'qr': 'waiting_qr'
  };
  return mapping[evolutionStatus] || 'disconnected';
}

function extractMessageContent(message: any): string {
  const msg = message.message;
  
  if (msg?.conversation) return msg.conversation;
  if (msg?.extendedTextMessage?.text) return msg.extendedTextMessage.text;
  if (msg?.imageMessage?.caption) return msg.imageMessage.caption || '[Imagem]';
  if (msg?.videoMessage?.caption) return msg.videoMessage.caption || '[Vídeo]';
  if (msg?.documentMessage?.fileName) return `[Documento: ${msg.documentMessage.fileName}]`;
  if (msg?.audioMessage) return '[Áudio]';
  
  return '[Mensagem não suportada]';
}

function getMessageType(message: any): string {
  const msg = message.message;
  
  if (msg?.imageMessage) return 'image';
  if (msg?.audioMessage) return 'audio';
  if (msg?.videoMessage) return 'video';
  if (msg?.documentMessage) return 'document';
  if (msg?.stickerMessage) return 'sticker';
  
  return 'text';
}

async function getOrCreateConversation(
  supabase: any,
  chipId: string,
  companyId: string,
  queueId: string | null,
  phoneNumber: string,
  contactName: string | null,
  assignedTo: string | null = null
) {
  // Buscar conversa existente (qualquer status exceto completed)
  let { data: conversation } = await supabase
    .from('conversations')
    .select('id')
    .eq('chip_id', chipId)
    .eq('phone_number', phoneNumber)
    .neq('status', 'completed')
    .maybeSingle();
    
  if (conversation) {
    return conversation.id;
  }

  // Criar nova conversa com status 'waiting' (aguardando aceitação)
  const { data: newConv, error } = await supabase
    .from('conversations')
    .insert({
      chip_id: chipId,
      company_id: companyId,
      queue_id: queueId,
      phone_number: phoneNumber,
      contact_name: contactName,
      assigned_to: assignedTo, // Atribui direto ao atendente se especificado
      status: 'waiting',
      last_message_at: new Date().toISOString()
    })
    .select('id')
    .single();

  if (error) {
    console.error('❌ Erro ao criar conversa:', error);
    throw error;
  }

  console.log('✅ Nova conversa criada:', newConv.id);
  return newConv.id;
}

async function executeAutomations(
  supabase: any,
  conversationId: string,
  messageContent: string,
  chipId: string
) {
  // Buscar bot flows ativos para este chip
  const { data: flows } = await supabase
    .from('bot_flows')
    .select('*')
    .eq('active', true)
    .limit(1);

  if (!flows || flows.length === 0) {
    console.log('ℹ️ Nenhum bot flow ativo');
    return;
  }

  console.log('🤖 Bot flow detectado, mas execução não implementada ainda');
  // TODO: Implementar execução de bot flows
}
