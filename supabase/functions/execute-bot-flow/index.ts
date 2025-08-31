import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { flowId, message, userId } = await req.json();

    if (!flowId || !message || !userId) {
      return new Response(JSON.stringify({ error: 'flowId, message e userId são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Buscar o fluxo no banco de dados
    const { data: flow, error: flowError } = await supabase
      .from('bot_flows')
      .select('*')
      .eq('id', flowId)
      .eq('active', true)
      .single();

    if (flowError || !flow) {
      return new Response(JSON.stringify({ error: 'Fluxo não encontrado ou inativo' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const nodes = Array.isArray(flow.nodes) ? flow.nodes : [];
    const edges = Array.isArray(flow.edges) ? flow.edges : [];

    console.log('Executando fluxo:', flow.name, 'com', nodes.length, 'nós');

    // Executar o fluxo
    const result = await executeFlow(nodes, edges, message, userId);

    return new Response(JSON.stringify({ 
      success: true, 
      result,
      flowName: flow.name 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro na execução do fluxo:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function executeFlow(nodes: any[], edges: any[], message: string, userId: string) {
  const results: any[] = [];
  
  // Encontrar nó de gatilho (trigger)
  const triggerNodes = nodes.filter(node => node.type === 'trigger');
  
  if (triggerNodes.length === 0) {
    return { error: 'Nenhum nó de gatilho encontrado' };
  }

  for (const triggerNode of triggerNodes) {
    const triggerKeywords = triggerNode.data?.config?.trigger?.split(',').map((k: string) => k.trim().toLowerCase()) || [];
    const messageWords = message.toLowerCase();

    // Verificar se a mensagem contém alguma palavra-chave do gatilho
    const isTriggered = triggerKeywords.some((keyword: string) => 
      messageWords.includes(keyword)
    );

    if (isTriggered) {
      console.log('Gatilho ativado:', triggerNode.data.label);
      
      // Encontrar nós conectados a este gatilho
      const connectedNodes = findConnectedNodes(triggerNode.id, edges, nodes);
      
      // Executar nós conectados
      for (const node of connectedNodes) {
        const nodeResult = await executeNode(node, message, userId);
        results.push({
          nodeId: node.id,
          nodeType: node.type,
          nodeLabel: node.data.label,
          result: nodeResult
        });
      }
    }
  }

  if (results.length === 0) {
    return { message: 'Nenhum gatilho foi ativado para esta mensagem' };
  }

  return { executedNodes: results };
}

function findConnectedNodes(sourceNodeId: string, edges: any[], nodes: any[]) {
  const connectedNodeIds = edges
    .filter(edge => edge.source === sourceNodeId)
    .map(edge => edge.target);
  
  return nodes.filter(node => connectedNodeIds.includes(node.id));
}

async function executeNode(node: any, message: string, userId: string) {
  const nodeType = node.type;
  const config = node.data?.config || {};

  console.log('Executando nó:', node.data.label, 'tipo:', nodeType);

  switch (nodeType) {
    case 'action':
      return { 
        type: 'message', 
        content: config.message || 'Mensagem padrão' 
      };

    case 'condition':
      const conditions = config.conditions || '';
      // Avaliar condições simples (você pode expandir isso)
      const isConditionMet = evaluateConditions(conditions, message);
      return { 
        type: 'condition', 
        result: isConditionMet,
        conditions: conditions
      };

    case 'webhook':
      return await executeWebhook(config.webhookUrl, message, userId);

    case 'gpt':
      return await executeGPT(config.gptPrompt, message);

    case 'n8n':
      return await executeN8N(config.n8nWorkflowId, message, userId);

    case 'typebot':
      return await executeTypebot(config.typebotId, message, userId);

    default:
      return { type: 'unknown', message: 'Tipo de nó não suportado' };
  }
}

function evaluateConditions(conditions: string, message: string): boolean {
  // Implementação simples de avaliação de condições
  // Você pode expandir isso para suportar condições mais complexas
  if (conditions.includes('contains:')) {
    const keyword = conditions.replace('contains:', '').trim();
    return message.toLowerCase().includes(keyword.toLowerCase());
  }
  
  if (conditions.includes('equals:')) {
    const value = conditions.replace('equals:', '').trim();
    return message.toLowerCase() === value.toLowerCase();
  }

  return true; // Default: sempre verdadeiro
}

async function executeWebhook(webhookUrl: string, message: string, userId: string) {
  if (!webhookUrl) {
    return { error: 'URL do webhook não configurada' };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        userId,
        timestamp: new Date().toISOString()
      }),
    });

    const data = await response.text();
    return { 
      type: 'webhook', 
      status: response.status,
      response: data
    };
  } catch (error) {
    return { 
      type: 'webhook', 
      error: error.message 
    };
  }
}

async function executeGPT(prompt: string, message: string) {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openAIApiKey) {
    return { error: 'API key do OpenAI não configurada' };
  }

  if (!prompt) {
    return { error: 'Prompt do GPT não configurado' };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: message }
        ],
        max_tokens: 500,
        temperature: 0.7
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { error: data.error?.message || 'Erro na API do OpenAI' };
    }

    return { 
      type: 'gpt', 
      response: data.choices[0].message.content 
    };
  } catch (error) {
    return { 
      type: 'gpt', 
      error: error.message 
    };
  }
}

async function executeN8N(workflowId: string, message: string, userId: string) {
  const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL');
  
  if (!n8nWebhookUrl || !workflowId) {
    return { error: 'Configuração do N8N incompleta' };
  }

  try {
    const webhookUrl = `${n8nWebhookUrl}/${workflowId}`;
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        userId,
        workflowId,
        timestamp: new Date().toISOString()
      }),
    });

    const data = await response.text();
    return { 
      type: 'n8n', 
      status: response.status,
      response: data
    };
  } catch (error) {
    return { 
      type: 'n8n', 
      error: error.message 
    };
  }
}

async function executeTypebot(typebotId: string, message: string, userId: string) {
  const typebotApiUrl = Deno.env.get('TYPEBOT_API_URL');
  
  if (!typebotApiUrl || !typebotId) {
    return { error: 'Configuração do Typebot incompleta' };
  }

  try {
    const response = await fetch(`${typebotApiUrl}/api/v1/typebots/${typebotId}/startChat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        userId,
      }),
    });

    const data = await response.json();
    return { 
      type: 'typebot', 
      response: data
    };
  } catch (error) {
    return { 
      type: 'typebot', 
      error: error.message 
    };
  }
}