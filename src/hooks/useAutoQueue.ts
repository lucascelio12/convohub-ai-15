import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface QueueRule {
  id: string;
  name: string;
  conditions: {
    keywords?: string[];
    timeRange?: { start: string; end: string };
    priority: number;
  };
  queue_id: string;
  active: boolean;
}

interface QueueAssignment {
  conversation_id: string;
  queue_id: string;
  assigned_agent?: string;
  priority: number;
}

export const useAutoQueue = () => {
  const [queueRules, setQueueRules] = useState<QueueRule[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadQueueRules();
  }, []);

  const loadQueueRules = async () => {
    try {
      const { data, error } = await supabase
        .from('queue_rules')
        .select('*')
        .eq('active', true)
        .order('priority', { ascending: false });

      if (error) throw error;
      setQueueRules(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar regras de fila:', error);
    }
  };

  const processNewConversation = async (conversationId: string, firstMessage: string) => {
    setIsProcessing(true);
    try {
      // Analisar mensagem para determinar fila apropriada
      const selectedQueue = await analyzeAndAssignQueue(firstMessage);
      
      if (selectedQueue) {
        await assignConversationToQueue(conversationId, selectedQueue.queue_id, selectedQueue.priority);
        
        toast({
          title: 'Conversa Atribuída',
          description: `Conversa direcionada automaticamente para a fila: ${selectedQueue.name}`,
        });
      }
    } catch (error: any) {
      console.error('Erro no processamento automático:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const analyzeAndAssignQueue = async (message: string): Promise<QueueRule | null> => {
    const currentTime = new Date().toTimeString().slice(0, 5);
    const messageLower = message.toLowerCase();

    // Encontrar a regra com maior prioridade que corresponde
    for (const rule of queueRules) {
      let matches = true;

      // Verificar palavras-chave
      if (rule.conditions.keywords && rule.conditions.keywords.length > 0) {
        const hasKeyword = rule.conditions.keywords.some(keyword => 
          messageLower.includes(keyword.toLowerCase())
        );
        if (!hasKeyword) matches = false;
      }

      // Verificar horário
      if (rule.conditions.timeRange) {
        const { start, end } = rule.conditions.timeRange;
        if (currentTime < start || currentTime > end) {
          matches = false;
        }
      }

      if (matches) {
        return rule;
      }
    }

    return null;
  };

  const assignConversationToQueue = async (conversationId: string, queueId: string, priority: number) => {
    try {
      // Atualizar conversa com a fila
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ 
          queue_id: queueId,
          status: 'new',
          priority: priority 
        })
        .eq('id', conversationId);

      if (updateError) throw updateError;

      // Encontrar agente disponível na fila
      const availableAgent = await findAvailableAgent(queueId);
      
      if (availableAgent) {
        await assignToAgent(conversationId, availableAgent.id);
      }

    } catch (error: any) {
      throw new Error('Erro ao atribuir conversa à fila: ' + error.message);
    }
  };

  const findAvailableAgent = async (queueId: string) => {
    try {
      const { data, error } = await supabase
        .from('queue_agents')
        .select(`
          agent_id,
          agents (
            id,
            name,
            status,
            max_conversations
          )
        `)
        .eq('queue_id', queueId)
        .eq('agents.status', 'online');

      if (error) throw error;

      // Encontrar agente com menos conversas ativas
      let bestAgent = null;
      let minConversations = Infinity;

      for (const queueAgent of data || []) {
        const { data: activeConversations } = await supabase
          .from('conversations')
          .select('id')
          .eq('assigned_to', queueAgent.agent_id)
          .in('status', ['new', 'in_progress']);

        const currentLoad = activeConversations?.length || 0;
        const maxLoad = queueAgent.agents?.max_conversations || 5;

        if (currentLoad < maxLoad && currentLoad < minConversations) {
          minConversations = currentLoad;
          bestAgent = queueAgent.agents;
        }
      }

      return bestAgent;
    } catch (error: any) {
      console.error('Erro ao encontrar agente:', error);
      return null;
    }
  };

  const assignToAgent = async (conversationId: string, agentId: string) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ 
          assigned_to: agentId,
          status: 'in_progress',
          assigned_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      if (error) throw error;
    } catch (error: any) {
      console.error('Erro ao atribuir agente:', error);
    }
  };

  const createQueueRule = async (rule: Omit<QueueRule, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('queue_rules')
        .insert(rule)
        .select()
        .single();

      if (error) throw error;
      
      await loadQueueRules();
      return data;
    } catch (error: any) {
      throw new Error('Erro ao criar regra: ' + error.message);
    }
  };

  return {
    queueRules,
    isProcessing,
    processNewConversation,
    createQueueRule,
    loadQueueRules,
  };
};