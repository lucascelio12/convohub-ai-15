import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AutoResponse {
  id: string;
  trigger: string;
  response: string;
  active: boolean;
  trigger_type: 'keyword' | 'greeting' | 'time_based' | 'fallback';
  conditions?: {
    time_range?: { start: string; end: string };
    queue_id?: string;
  };
}

interface ChatbotFlow {
  id: string;
  name: string;
  steps: ChatbotStep[];
  active: boolean;
}

interface ChatbotStep {
  id: string;
  message: string;
  options?: {
    text: string;
    next_step?: string;
    action?: 'transfer_to_agent' | 'end_conversation' | 'collect_info';
  }[];
  type: 'message' | 'question' | 'action';
}

export const useAutoResponse = () => {
  const [autoResponses, setAutoResponses] = useState<AutoResponse[]>([]);
  const [chatbotFlows, setChatbotFlows] = useState<ChatbotFlow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadAutoResponses();
    loadChatbotFlows();
  }, []);

  const loadAutoResponses = async () => {
    try {
      // Simula respostas automáticas até as tabelas serem criadas
      const mockResponses: AutoResponse[] = [
        {
          id: '1',
          trigger: 'oi,olá,ola',
          response: 'Olá! Como posso ajudá-lo hoje?',
          trigger_type: 'greeting',
          active: true,
        },
        {
          id: '2',
          trigger: 'horario,funcionamento',
          response: 'Nosso horário de atendimento é de segunda a sexta, das 8h às 18h.',
          trigger_type: 'keyword',
          active: true,
        }
      ];
      setAutoResponses(mockResponses);
    } catch (error: any) {
      console.error('Erro ao carregar respostas automáticas:', error);
    }
  };

  const loadChatbotFlows = async () => {
    try {
      // Simula fluxos do chatbot
      const mockFlows: ChatbotFlow[] = [
        {
          id: '1',
          name: 'default',
          active: true,
          steps: [
            {
              id: 'step1',
              message: 'Bem-vindo! Como posso ajudá-lo?',
              type: 'question',
              options: [
                { text: 'Suporte', next_step: 'step2' },
                { text: 'Vendas', action: 'transfer_to_agent' }
              ]
            }
          ]
        }
      ];
      setChatbotFlows(mockFlows);
    } catch (error: any) {
      console.error('Erro ao carregar fluxos do chatbot:', error);
    }
  };

  const processMessage = async (conversationId: string, message: string, isFirstMessage = false) => {
    setIsProcessing(true);
    
    try {
      // Verificar se deve enviar resposta automática
      const autoResponse = findMatchingResponse(message, isFirstMessage);
      
      if (autoResponse) {
        await sendAutoResponse(conversationId, autoResponse.response);
        
        // Se for saudação, iniciar fluxo do chatbot
        if (autoResponse.trigger_type === 'greeting') {
          await startChatbotFlow(conversationId);
        }
      }
      
    } catch (error: any) {
      console.error('Erro no processamento da mensagem:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const findMatchingResponse = (message: string, isFirstMessage: boolean): AutoResponse | null => {
    const messageLower = message.toLowerCase();
    const currentTime = new Date().toTimeString().slice(0, 5);

    // Verificar saudações primeiro (para primeira mensagem)
    if (isFirstMessage) {
      const greetingResponse = autoResponses.find(
        response => response.trigger_type === 'greeting'
      );
      if (greetingResponse) return greetingResponse;
    }

    // Verificar palavras-chave
    for (const response of autoResponses) {
      if (response.trigger_type === 'keyword') {
        const keywords = response.trigger.toLowerCase().split(',').map(k => k.trim());
        
        if (keywords.some(keyword => messageLower.includes(keyword))) {
          // Verificar condições de tempo se existirem
          if (response.conditions?.time_range) {
            const { start, end } = response.conditions.time_range;
            if (currentTime >= start && currentTime <= end) {
              return response;
            }
          } else {
            return response;
          }
        }
      }
    }

    // Resposta padrão/fallback
    const fallbackResponse = autoResponses.find(
      response => response.trigger_type === 'fallback'
    );
    
    return fallbackResponse || null;
  };

  const sendAutoResponse = async (conversationId: string, responseText: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          content: responseText,
          sender_type: 'bot',
          message_type: 'text',
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      // Marcar conversa como tendo resposta automática
      await supabase
        .from('conversations')
        .update({ 
          has_auto_response: true,
          last_message_at: new Date().toISOString()
        })
        .eq('id', conversationId);

    } catch (error: any) {
      throw new Error('Erro ao enviar resposta automática: ' + error.message);
    }
  };

  const startChatbotFlow = async (conversationId: string) => {
    try {
      // Simula início do fluxo do chatbot
      console.log('Iniciando fluxo do chatbot para conversa:', conversationId);
    } catch (error: any) {
      console.error('Erro ao iniciar fluxo do chatbot:', error);
    }
  };

  const processChatbotResponse = async (conversationId: string, userResponse: string) => {
    try {
      // Simula processamento da resposta do chatbot
      console.log('Processando resposta do chatbot:', userResponse);
    } catch (error: any) {
      console.error('Erro ao processar resposta do chatbot:', error);
    }
  };

  const handleChatbotAction = async (conversationId: string, option: any, sessionId: string) => {
    try {
      switch (option.action) {
        case 'transfer_to_agent':
          await transferToAgent(conversationId);
          await endChatbotSession(sessionId);
          break;
          
        case 'end_conversation':
          await endConversation(conversationId);
          await endChatbotSession(sessionId);
          break;
          
        case 'collect_info':
          await collectUserInfo(conversationId, option);
          break;
          
        default:
          if (option.next_step) {
            await moveToNextStep(conversationId, option.next_step, sessionId);
          }
      }
    } catch (error: any) {
      console.error('Erro ao executar ação do chatbot:', error);
    }
  };

  const transferToAgent = async (conversationId: string) => {
    await supabase
      .from('conversations')
      .update({ 
        status: 'in_progress',
        requires_agent: true 
      })
      .eq('id', conversationId);

    await sendAutoResponse(conversationId, 
      'Vou transferir você para um de nossos atendentes. Por favor, aguarde um momento.'
    );
  };

  const endConversation = async (conversationId: string) => {
    await supabase
      .from('conversations')
      .update({ status: 'completed' })
      .eq('id', conversationId);
  };

  const endChatbotSession = async (sessionId: string) => {
    await supabase
      .from('chatbot_sessions')
      .update({ active: false })
      .eq('id', sessionId);
  };

  const moveToNextStep = async (conversationId: string, nextStepId: string, sessionId: string) => {
    // Atualizar sessão com próximo passo
    await supabase
      .from('chatbot_sessions')
      .update({ current_step: nextStepId })
      .eq('id', sessionId);

    // Encontrar e enviar próxima mensagem
    const flow = chatbotFlows.find(f => f.steps.some(s => s.id === nextStepId));
    const nextStep = flow?.steps.find(s => s.id === nextStepId);

    if (nextStep) {
      await sendAutoResponse(conversationId, nextStep.message);
    }
  };

  const collectUserInfo = async (conversationId: string, option: any) => {
    // Implementar coleta de informações específicas
    await sendAutoResponse(conversationId, 
      'Obrigado pelas informações. Como posso ajudá-lo hoje?'
    );
  };

  const createAutoResponse = async (response: Omit<AutoResponse, 'id'>) => {
    try {
      // Simula criação de resposta automática
      const newResponse: AutoResponse = {
        ...response,
        id: Date.now().toString(),
      };
      
      setAutoResponses(prev => [...prev, newResponse]);
      
      toast({
        title: 'Resposta Criada',
        description: 'Nova resposta automática adicionada com sucesso',
      });
      
      return newResponse;
    } catch (error: any) {
      throw new Error('Erro ao criar resposta automática: ' + error.message);
    }
  };

  return {
    autoResponses,
    chatbotFlows,
    isProcessing,
    processMessage,
    processChatbotResponse,
    createAutoResponse,
    loadAutoResponses,
  };
};