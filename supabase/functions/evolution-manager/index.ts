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

    const { action, chipId, phoneNumber, message, companyId } = await req.json();
    console.log('🎯 Ação:', action, 'Chip:', chipId);

    // Buscar configuração da Evolution API
    const { data: config, error: configError } = await supabase
      .from('evolution_api_configs')
      .select('api_url, api_key')
      .eq('company_id', companyId)
      .eq('active', true)
      .single();

    if (configError || !config) {
      console.error('❌ Configuração Evolution API não encontrada:', configError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Evolution API não configurada. Configure em Configurações > Evolution API' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { api_url: apiUrl, api_key: apiKey } = config;

    switch (action) {
      case 'create-instance':
        return await createInstance(apiUrl, apiKey, chipId);
      case 'connect':
        return await connectInstance(apiUrl, apiKey, chipId);
      case 'disconnect':
        return await disconnectInstance(apiUrl, apiKey, chipId);
      case 'send-message':
        return await sendMessage(apiUrl, apiKey, chipId, phoneNumber, message);
      case 'get-status':
        return await getStatus(apiUrl, apiKey, chipId);
      case 'delete-instance':
        return await deleteInstance(apiUrl, apiKey, chipId);
      default:
        throw new Error('Ação inválida');
    }
  } catch (error) {
    console.error('❌ Erro:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function createInstance(apiUrl: string, apiKey: string, chipId: string) {
  console.log('🔧 Criando instância:', chipId);
  
  const response = await fetch(`${apiUrl}/instance/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': apiKey
    },
    body: JSON.stringify({
      instanceName: chipId,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS'
    })
  });
  
  const data = await response.json();
  console.log('✅ Instância criada:', data);
  
  return new Response(JSON.stringify({
    success: true,
    data
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function connectInstance(apiUrl: string, apiKey: string, chipId: string) {
  console.log('🔌 Conectando instância:', chipId);
  
  const response = await fetch(`${apiUrl}/instance/connect/${chipId}`, {
    method: 'GET',
    headers: { 'apikey': apiKey }
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error('❌ Erro ao conectar:', error);
    throw new Error(`Erro ao conectar: ${error}`);
  }
  
  const data = await response.json();
  console.log('✅ Conectado:', data);
  
  return new Response(JSON.stringify({
    success: true,
    qrCode: data.base64 || data.qrcode?.base64,
    status: data.state
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function disconnectInstance(apiUrl: string, apiKey: string, chipId: string) {
  console.log('🔌 Desconectando instância:', chipId);
  
  const response = await fetch(`${apiUrl}/instance/logout/${chipId}`, {
    method: 'DELETE',
    headers: { 'apikey': apiKey }
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error('❌ Erro ao desconectar:', error);
  }
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function sendMessage(
  apiUrl: string,
  apiKey: string,
  chipId: string,
  phoneNumber: string,
  message: string
) {
  console.log('📤 Enviando mensagem:', chipId, phoneNumber);
  
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  
  const response = await fetch(`${apiUrl}/message/sendText/${chipId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': apiKey
    },
    body: JSON.stringify({
      number: cleanPhone,
      text: message
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error('❌ Erro ao enviar mensagem:', error);
    throw new Error(`Erro ao enviar mensagem: ${error}`);
  }
  
  const data = await response.json();
  console.log('✅ Mensagem enviada:', data);
  
  return new Response(JSON.stringify({
    success: true,
    messageId: data.key?.id
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function getStatus(apiUrl: string, apiKey: string, chipId: string) {
  console.log('📊 Obtendo status:', chipId);
  
  const response = await fetch(`${apiUrl}/instance/connectionState/${chipId}`, {
    method: 'GET',
    headers: { 'apikey': apiKey }
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error('❌ Erro ao obter status:', error);
    throw new Error(`Erro ao obter status: ${error}`);
  }
  
  const data = await response.json();
  console.log('✅ Status:', data);
  
  return new Response(JSON.stringify({
    success: true,
    status: data.state
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function deleteInstance(apiUrl: string, apiKey: string, chipId: string) {
  console.log('🗑️ Deletando instância:', chipId);
  
  const response = await fetch(`${apiUrl}/instance/delete/${chipId}`, {
    method: 'DELETE',
    headers: { 'apikey': apiKey }
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error('❌ Erro ao deletar:', error);
  }
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
