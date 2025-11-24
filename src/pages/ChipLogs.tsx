import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Activity, AlertCircle, CheckCircle, Clock, Smartphone } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChipLog {
  id: string;
  chip_id: string;
  event_type: string;
  status: string;
  details: string | null;
  error_message: string | null;
  created_at: string;
  chips?: {
    name: string;
    phone_number: string;
  };
}

interface Chip {
  id: string;
  name: string;
}

export default function ChipLogs() {
  const [logs, setLogs] = useState<ChipLog[]>([]);
  const [chips, setChips] = useState<Chip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChip, setSelectedChip] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchChips();
    fetchLogs();

    // Realtime subscription para novos logs
    const channel = supabase
      .channel('chip-logs-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chip_connection_logs'
        },
        (payload) => {
          console.log('📝 Novo log recebido:', payload);
          fetchLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchChips = async () => {
    try {
      const { data, error } = await supabase
        .from('chips')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setChips(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar chips:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('chip_connection_logs')
        .select('*, chips(name, phone_number)')
        .order('created_at', { ascending: false })
        .limit(200);

      if (selectedChip !== 'all') {
        query = query.eq('chip_id', selectedChip);
      }

      if (selectedEvent !== 'all') {
        query = query.eq('event_type', selectedEvent);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar logs:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar logs: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedChip, selectedEvent]);

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'disconnected':
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
      case 'connection_attempt':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'qr_generated':
        return <Smartphone className="h-4 w-4 text-blue-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      success: { className: 'bg-green-100 text-green-800', label: 'Sucesso' },
      error: { className: 'bg-red-100 text-red-800', label: 'Erro' },
      pending: { className: 'bg-yellow-100 text-yellow-800', label: 'Pendente' },
    };

    const variant = variants[status] || variants.pending;
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  const getEventLabel = (eventType: string) => {
    const labels: Record<string, string> = {
      connected: 'Conectado',
      disconnected: 'Desconectado',
      connection_attempt: 'Tentativa de Conexão',
      qr_generated: 'QR Code Gerado',
      error: 'Erro',
      status_change: 'Mudança de Status',
    };
    return labels[eventType] || eventType;
  };

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const chipName = log.chips?.name || '';
    const details = log.details || '';
    return chipName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           details.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Logs de Conexão dos Chips</h1>
        <p className="text-sm text-muted-foreground">
          Histórico de eventos e mudanças de status em tempo real
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Filtros
          </CardTitle>
          <CardDescription>Filtre os logs por chip e tipo de evento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Input
                placeholder="Buscar por chip ou detalhes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Select value={selectedChip} onValueChange={setSelectedChip}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um chip" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os chips</SelectItem>
                  {chips.map((chip) => (
                    <SelectItem key={chip.id} value={chip.id}>
                      {chip.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de evento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os eventos</SelectItem>
                  <SelectItem value="connected">Conectado</SelectItem>
                  <SelectItem value="disconnected">Desconectado</SelectItem>
                  <SelectItem value="connection_attempt">Tentativa de Conexão</SelectItem>
                  <SelectItem value="qr_generated">QR Code Gerado</SelectItem>
                  <SelectItem value="error">Erro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Eventos</CardTitle>
          <CardDescription>
            {filteredLogs.length} {filteredLogs.length === 1 ? 'evento' : 'eventos'} encontrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum log encontrado</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Data/Hora</TableHead>
                    <TableHead>Chip</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs">
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Smartphone className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{log.chips?.name || 'N/A'}</div>
                            <div className="text-xs text-muted-foreground">
                              {log.chips?.phone_number || ''}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getEventIcon(log.event_type)}
                          <span className="text-sm">{getEventLabel(log.event_type)}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell className="max-w-md">
                        <div className="text-sm">
                          {log.details && (
                            <p className="text-muted-foreground">{log.details}</p>
                          )}
                          {log.error_message && (
                            <p className="text-red-600 mt-1">{log.error_message}</p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
