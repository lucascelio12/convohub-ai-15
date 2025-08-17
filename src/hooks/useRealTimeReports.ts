import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RealtimeMetrics {
  totalConversations: number;
  activeConversations: number;
  completedToday: number;
  averageResponseTime: number;
  agentPerformance: AgentMetric[];
  queueMetrics: QueueMetric[];
  hourlyData: HourlyData[];
  responseTimeChart: ResponseTimeData[];
}

interface AgentMetric {
  id: string;
  name: string;
  activeConversations: number;
  completedToday: number;
  averageResponseTime: number;
  status: 'online' | 'offline' | 'busy';
}

interface QueueMetric {
  id: string;
  name: string;
  waitingCount: number;
  averageWaitTime: number;
  completedToday: number;
}

interface HourlyData {
  hour: string;
  conversations: number;
  completed: number;
  responseTime: number;
}

interface ResponseTimeData {
  time: string;
  avgResponseTime: number;
  agentCount: number;
}

export const useRealTimeReports = () => {
  const [metrics, setMetrics] = useState<RealtimeMetrics>({
    totalConversations: 0,
    activeConversations: 0,
    completedToday: 0,
    averageResponseTime: 0,
    agentPerformance: [],
    queueMetrics: [],
    hourlyData: [],
    responseTimeChart: [],
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    loadMetrics();
    
    // Atualizar métricas a cada 30 segundos
    const interval = setInterval(loadMetrics, 30000);
    
    // Configurar realtime subscriptions
    const conversationsSubscription = supabase
      .channel('conversations_realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'conversations' },
        () => loadMetrics()
      )
      .subscribe();

    const messagesSubscription = supabase
      .channel('messages_realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'messages' },
        () => loadMetrics()
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      conversationsSubscription.unsubscribe();
      messagesSubscription.unsubscribe();
    };
  }, []);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      
      const [
        conversationsData,
        agentsData,
        queuesData,
        hourlyData,
        responseTimeData
      ] = await Promise.all([
        loadConversationMetrics(),
        loadAgentMetrics(),
        loadQueueMetrics(),
        loadHourlyData(),
        loadResponseTimeData()
      ]);

      setMetrics({
        ...conversationsData,
        agentPerformance: agentsData,
        queueMetrics: queuesData,
        hourlyData: hourlyData,
        responseTimeChart: responseTimeData,
      });

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConversationMetrics = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    // Total de conversas
    const { count: totalConversations } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true });

    // Conversas ativas
    const { count: activeConversations } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .in('status', ['new', 'in_progress']);

    // Finalizadas hoje
    const { count: completedToday } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('updated_at', today);

    // Tempo médio de resposta
    const { data: responseTimes } = await supabase
      .from('messages')
      .select('created_at, conversation_id')
      .gte('created_at', today)
      .eq('sender_type', 'agent');

    let averageResponseTime = 0;
    if (responseTimes && responseTimes.length > 0) {
      // Calcular tempo médio de resposta (simplificado)
      averageResponseTime = Math.floor(Math.random() * 300) + 60; // Mock temporário
    }

    return {
      totalConversations: totalConversations || 0,
      activeConversations: activeConversations || 0,
      completedToday: completedToday || 0,
      averageResponseTime,
    };
  };

  const loadAgentMetrics = async (): Promise<AgentMetric[]> => {
    try {
      // Simula métricas de agentes
      const mockAgents: AgentMetric[] = [
        {
          id: 'agent-1',
          name: 'Ana Silva',
          activeConversations: 3,
          completedToday: 12,
          averageResponseTime: 95,
          status: 'online',
        },
        {
          id: 'agent-2', 
          name: 'João Santos',
          activeConversations: 2,
          completedToday: 8,
          averageResponseTime: 120,
          status: 'online',
        }
      ];
      
      return mockAgents;
    } catch (error) {
      console.error('Erro ao carregar métricas de agentes:', error);
      return [];
    }
  };

  const loadQueueMetrics = async (): Promise<QueueMetric[]> => {
    try {
      const { data: queues } = await supabase
        .from('queues')
        .select('*');

      if (!queues) return [];

      const queueMetrics = await Promise.all(
        queues.map(async (queue) => {
          const { count: waitingCount } = await supabase
            .from('conversations')
            .select('*', { count: 'exact', head: true })
            .eq('queue_id', queue.id)
            .eq('status', 'new');

          const today = new Date().toISOString().split('T')[0];
          const { count: completedToday } = await supabase
            .from('conversations')
            .select('*', { count: 'exact', head: true })
            .eq('queue_id', queue.id)
            .eq('status', 'completed')
            .gte('updated_at', today);

          return {
            id: queue.id,
            name: queue.name,
            waitingCount: waitingCount || 0,
            averageWaitTime: Math.floor(Math.random() * 600) + 60, // Mock
            completedToday: completedToday || 0,
          };
        })
      );

      return queueMetrics;
    } catch (error) {
      console.error('Erro ao carregar métricas de filas:', error);
      return [];
    }
  };

  const loadHourlyData = async (): Promise<HourlyData[]> => {
    const today = new Date().toISOString().split('T')[0];
    const hours = Array.from({ length: 24 }, (_, i) => i);

    const hourlyData = await Promise.all(
      hours.map(async (hour) => {
        const hourStart = `${today}T${hour.toString().padStart(2, '0')}:00:00`;
        const hourEnd = `${today}T${hour.toString().padStart(2, '0')}:59:59`;

        const { count: conversations } = await supabase
          .from('conversations')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', hourStart)
          .lte('created_at', hourEnd);

        const { count: completed } = await supabase
          .from('conversations')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'completed')
          .gte('updated_at', hourStart)
          .lte('updated_at', hourEnd);

        return {
          hour: `${hour}:00`,
          conversations: conversations || 0,
          completed: completed || 0,
          responseTime: Math.floor(Math.random() * 200) + 50, // Mock
        };
      })
    );

    return hourlyData;
  };

  const loadResponseTimeData = async (): Promise<ResponseTimeData[]> => {
    // Gerar dados das últimas 24 horas
    const now = new Date();
    const data = [];

    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      data.push({
        time: time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        avgResponseTime: Math.floor(Math.random() * 200) + 50, // Mock
        agentCount: Math.floor(Math.random() * 10) + 1, // Mock
      });
    }

    return data;
  };

  const exportMetrics = async (format: 'csv' | 'pdf' = 'csv') => {
    try {
      // Preparar dados para exportação
      const exportData = {
        metrics,
        timestamp: new Date().toISOString(),
        period: 'daily',
      };

      if (format === 'csv') {
        const csvContent = convertToCSV(exportData);
        downloadFile(csvContent, `relatorio-${Date.now()}.csv`, 'text/csv');
      } else {
        // Para PDF, usar uma biblioteca como jsPDF ou similar
        console.log('Exportação PDF não implementada ainda');
      }
    } catch (error) {
      console.error('Erro ao exportar métricas:', error);
    }
  };

  const convertToCSV = (data: any): string => {
    const headers = ['Métrica', 'Valor'];
    const rows = [
      ['Total de Conversas', data.metrics.totalConversations],
      ['Conversas Ativas', data.metrics.activeConversations],
      ['Finalizadas Hoje', data.metrics.completedToday],
      ['Tempo Médio de Resposta (s)', data.metrics.averageResponseTime],
    ];

    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');

    return csvContent;
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return {
    metrics,
    loading,
    lastUpdate,
    loadMetrics,
    exportMetrics,
  };
};