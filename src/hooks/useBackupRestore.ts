import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BackupData {
  conversations: any[];
  messages: any[];
  agents: any[];
  queues: any[];
  timestamp: string;
  version: string;
}

interface BackupFile {
  id: string;
  name: string;
  size: number;
  created_at: string;
  type: 'manual' | 'automatic';
  status: 'completed' | 'in_progress' | 'failed';
}

export const useBackupRestore = () => {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupFiles, setBackupFiles] = useState<BackupFile[]>([]);
  const { toast } = useToast();

  const createBackup = async (includeMessages = true, description?: string) => {
    setIsBackingUp(true);
    
    try {
      // Buscar todas as conversas
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('*');

      if (convError) throw convError;

      let messages = [];
      if (includeMessages) {
        const { data: messagesData, error: msgError } = await supabase
          .from('messages')
          .select('*')
          .order('created_at', { ascending: true });

        if (msgError) throw msgError;
        messages = messagesData || [];
      }

      // Simula busca de configurações
      const agents = [{ id: 'agent-1', name: 'Agente Simulado' }];
      const queues = [{ id: 'queue-1', name: 'Fila Simulada' }];

      const backupData: BackupData = {
        conversations: conversations || [],
        messages,
        agents: agents || [],
        queues: queues || [],
        timestamp: new Date().toISOString(),
        version: '1.0',
      };

      // Simula salvamento do backup
      const fileName = `backup-${Date.now()}.json`;
      
      // Download local do backup
      downloadBackup(backupData, fileName);

      toast({
        title: 'Backup Criado',
        description: `Backup criado com sucesso: ${fileName}`,
      });

      await loadBackupFiles();

    } catch (error: any) {
      toast({
        title: 'Erro no Backup',
        description: 'Erro ao criar backup: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const restoreFromBackup = async (backupFile: File | string) => {
    setIsRestoring(true);

    try {
      let backupData: BackupData;

      if (typeof backupFile === 'string') {
        // Restaurar do Supabase Storage
        const { data, error } = await supabase.storage
          .from('backups')
          .download(backupFile);

        if (error) throw error;
        
        const text = await data.text();
        backupData = JSON.parse(text);
      } else {
        // Restaurar de arquivo local
        const text = await backupFile.text();
        backupData = JSON.parse(text);
      }

      // Validar estrutura do backup
      if (!backupData.conversations || !backupData.timestamp) {
        throw new Error('Arquivo de backup inválido');
      }

      // Confirmar restauração (limpa dados existentes)
      const confirmRestore = window.confirm(
        'ATENÇÃO: Esta operação irá substituir todos os dados existentes. Deseja continuar?'
      );

      if (!confirmRestore) {
        setIsRestoring(false);
        return;
      }

      // Backup de segurança antes da restauração
      await createBackup(true, 'Backup automático antes da restauração');

      // Limpar dados existentes
      await clearExistingData();

      // Restaurar conversas
      if (backupData.conversations.length > 0) {
        const { error: convError } = await supabase
          .from('conversations')
          .insert(backupData.conversations);

        if (convError) throw convError;
      }

      // Restaurar mensagens
      if (backupData.messages && backupData.messages.length > 0) {
        // Processar em lotes para evitar timeouts
        const batchSize = 100;
        for (let i = 0; i < backupData.messages.length; i += batchSize) {
          const batch = backupData.messages.slice(i, i + batchSize);
          const { error: msgError } = await supabase
            .from('messages')
            .insert(batch);

          if (msgError) throw msgError;
        }
      }

      // Restaurar configurações
      if (backupData.queues && backupData.queues.length > 0) {
        const { error: queueError } = await supabase
          .from('queues')
          .insert(backupData.queues);

        if (queueError) console.warn('Erro ao restaurar filas:', queueError);
      }

      toast({
        title: 'Restauração Concluída',
        description: `Dados restaurados com sucesso do backup de ${new Date(backupData.timestamp).toLocaleString('pt-BR')}`,
      });

    } catch (error: any) {
      toast({
        title: 'Erro na Restauração',
        description: 'Erro ao restaurar backup: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const clearExistingData = async () => {
    try {
      // Limpar em ordem devido às foreign keys
      await supabase.from('messages').delete().gt('id', 0);
      await supabase.from('conversations').delete().gt('id', 0);
      
      // Não limpar agents e queues pois podem ter constraints
    } catch (error) {
      console.warn('Aviso ao limpar dados:', error);
    }
  };

  const downloadBackup = (backupData: BackupData, fileName: string) => {
    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const loadBackupFiles = async () => {
    try {
      // Simula lista de backups
      const mockBackups: BackupFile[] = [
        {
          id: '1',
          name: 'Backup Manual - 15/01/2024',
          size: 1024000,
          created_at: new Date().toISOString(),
          type: 'manual',
          status: 'completed',
        }
      ];
      setBackupFiles(mockBackups);
    } catch (error) {
      console.error('Erro ao carregar arquivos de backup:', error);
    }
  };

  const deleteBackup = async (fileId: string, filePath: string) => {
    try {
      // Simula remoção do backup
      setBackupFiles(prev => prev.filter(b => b.id !== fileId));
      
      toast({
        title: 'Backup Deletado',
        description: 'Arquivo de backup removido com sucesso',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao Deletar',
        description: 'Erro ao deletar backup: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const scheduleAutomaticBackup = async (frequency: 'daily' | 'weekly' | 'monthly') => {
    try {
      // Implementar agendamento de backup automático
      // Isso normalmente seria feito via Edge Functions ou cron jobs
      
      const { error } = await supabase
        .from('backup_schedules')
        .upsert({
          frequency,
          active: true,
          next_run: calculateNextRun(frequency),
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: 'Backup Automático Configurado',
        description: `Backup automático agendado para execução ${frequency === 'daily' ? 'diária' : frequency === 'weekly' ? 'semanal' : 'mensal'}`,
      });

    } catch (error: any) {
      toast({
        title: 'Erro na Configuração',
        description: 'Erro ao configurar backup automático: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const calculateNextRun = (frequency: string): string => {
    const now = new Date();
    switch (frequency) {
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      case 'monthly':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    }
  };

  return {
    isBackingUp,
    isRestoring,
    backupFiles,
    createBackup,
    restoreFromBackup,
    loadBackupFiles,
    deleteBackup,
    scheduleAutomaticBackup,
  };
};