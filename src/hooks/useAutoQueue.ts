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
      // Simula regras de fila até as tabelas serem criadas
      const mockRules: QueueRule[] = [
        {
          id: '1',
          name: 'Suporte Técnico',
          conditions: { keywords: ['problema', 'erro', 'bug'], priority: 1 },
          queue_id: 'queue-1',
          active: true,
        },
        {
          id: '2', 
          name: 'Vendas',
          conditions: { keywords: ['comprar', 'preço', 'orçamento'], priority: 2 },
          queue_id: 'queue-2',
          active: true,
        }
      ];
      setQueueRules(mockRules);
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
        await assignConversationToQueue(conversationId, selectedQueue.queue_id, selectedQueue.conditions.priority);
        
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
      // Simula busca de agente disponível
      const mockAgent = {
        id: 'agent-1',
        name: 'Agente Simulado',
        status: 'online',
        max_conversations: 5
      };
      
      return mockAgent;
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
      // Simula criação de regra
      const newRule: QueueRule = {
        ...rule,
        id: Date.now().toString(),
      };
      
      setQueueRules(prev => [...prev, newRule]);
      
      toast({
        title: 'Regra Criada',
        description: 'Nova regra de fila adicionada com sucesso',
      });
      
      return newRule;
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