import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Smartphone, Signal, MoreVertical, AlertTriangle, QrCode, Settings, Wifi } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Chip {
  id: string;
  name: string;
  phone_number: string;
  status: 'active' | 'inactive' | 'blocked' | 'connecting' | 'disconnected';
  priority: number;
  daily_limit: number;
  current_usage: number;
  created_at: string;
  queue_id?: string;
}

interface Queue {
  id: string;
  name: string;
  color: string;
}

export default function Chips() {
  const [chips, setChips] = useState<Chip[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedChip, setSelectedChip] = useState<Chip | null>(null);
  const [qrCode, setQrCode] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'failed' | 'idle'>('idle');
  const [newChip, setNewChip] = useState({
    name: '',
    phone_number: '',
    daily_limit: 100,
    priority: 1
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchChips();
    fetchQueues();
  }, []);

  const fetchQueues = async () => {
    try {
      const { data, error } = await supabase
        .from('queues')
        .select('id, name, color')
        .order('name');

      if (error) throw error;
      setQueues((data as Queue[]) || []);
    } catch (error: any) {
      console.error('Error fetching queues:', error);
    }
  };

  const fetchChips = async () => {
    try {
      const { data, error } = await supabase
        .from('chips')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChips((data as Chip[]) || []);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar chips: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createChip = async () => {
    if (!newChip.name.trim() || !newChip.phone_number.trim()) return;

    try {
      const { error } = await supabase
        .from('chips')
        .insert({
          name: newChip.name,
          phone_number: newChip.phone_number,
          daily_limit: newChip.daily_limit,
          priority: newChip.priority
        });

      if (error) throw error;
      
      setDialogOpen(false);
      setNewChip({ name: '', phone_number: '', daily_limit: 100, priority: 1 });
      fetchChips();
      
      toast({
        title: 'Sucesso',
        description: 'Chip criado com sucesso!',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao criar chip: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const startConnection = async (chip: Chip) => {
    setSelectedChip(chip);
    setConnectionStatus('connecting');
    setQrDialogOpen(true);
    
    // Simular geração de QR code - aqui você integraria com sua API de WhatsApp
    setTimeout(() => {
      setQrCode(`data:image/svg+xml;base64,${btoa(`
        <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
          <rect width="200" height="200" fill="white"/>
          <text x="100" y="100" font-family="Arial" font-size="12" text-anchor="middle" fill="black">
            QR Code para ${chip.name}
          </text>
          <text x="100" y="120" font-family="Arial" font-size="10" text-anchor="middle" fill="gray">
            ${chip.phone_number}
          </text>
        </svg>
      `)}`);
    }, 1000);
  };

  const openConfigDialog = (chip: Chip) => {
    setSelectedChip(chip);
    setConfigDialogOpen(true);
  };

  const updateChipQueue = async (queueId: string) => {
    if (!selectedChip) return;

    try {
      const { error } = await supabase
        .from('chips')
        .update({ queue_id: queueId })
        .eq('id', selectedChip.id);

      if (error) throw error;
      
      setConfigDialogOpen(false);
      fetchChips();
      
      toast({
        title: 'Sucesso',
        description: 'Fila configurada com sucesso!',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao configurar fila: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'connecting': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'disconnected': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'blocked': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'connecting': return 'Conectando';
      case 'disconnected': return 'Desconectado';
      case 'inactive': return 'Inativo';
      case 'blocked': return 'Bloqueado';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Chips WhatsApp</h1>
          <p className="text-muted-foreground">Gerencie os números do WhatsApp Business</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Chip
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Novo Chip</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nome do Chip</Label>
                <Input
                  id="name"
                  value={newChip.name}
                  onChange={(e) => setNewChip({ ...newChip, name: e.target.value })}
                  placeholder="Ex: Chip Principal, Chip Vendas..."
                />
              </div>
              <div>
                <Label htmlFor="phone">Número do WhatsApp</Label>
                <Input
                  id="phone"
                  value={newChip.phone_number}
                  onChange={(e) => setNewChip({ ...newChip, phone_number: e.target.value })}
                  placeholder="Ex: +5511999999999"
                />
              </div>
              <div>
                <Label htmlFor="limit">Limite Diário de Mensagens</Label>
                <Input
                  id="limit"
                  type="number"
                  value={newChip.daily_limit}
                  onChange={(e) => setNewChip({ ...newChip, daily_limit: parseInt(e.target.value) || 100 })}
                  min="1"
                />
              </div>
              <div>
                <Label htmlFor="priority">Prioridade</Label>
                <Input
                  id="priority"
                  type="number"
                  value={newChip.priority}
                  onChange={(e) => setNewChip({ ...newChip, priority: parseInt(e.target.value) || 1 })}
                  min="1"
                  max="10"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={createChip}>
                  Adicionar Chip
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {chips.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Smartphone className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum chip cadastrado</h3>
            <p className="text-muted-foreground text-center mb-4">
              Adicione seu primeiro chip do WhatsApp Business
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeiro Chip
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {chips.map((chip) => (
            <Card key={chip.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{chip.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(chip.status)}>
                      {getStatusLabel(chip.status)}
                    </Badge>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{chip.phone_number}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Usage Progress */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Uso Diário</span>
                      <span className="text-sm text-muted-foreground">
                        {chip.current_usage} / {chip.daily_limit}
                      </span>
                    </div>
                    <Progress 
                      value={(chip.current_usage / chip.daily_limit) * 100} 
                      className="h-2"
                    />
                    {chip.current_usage / chip.daily_limit > 0.8 && (
                      <div className="flex items-center gap-1 mt-1">
                        <AlertTriangle className="h-3 w-3 text-yellow-500" />
                        <span className="text-xs text-yellow-600">Próximo do limite</span>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                    <div className="text-center">
                      <p className="text-sm font-medium">{chip.priority}</p>
                      <p className="text-xs text-muted-foreground">Prioridade</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Signal className="h-3 w-3 text-green-500" />
                        <p className="text-sm font-medium">Online</p>
                      </div>
                      <p className="text-xs text-muted-foreground">Status</p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground">
                      Adicionado em {new Date(chip.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}