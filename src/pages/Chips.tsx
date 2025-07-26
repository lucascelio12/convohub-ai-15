import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Smartphone, Signal, MoreVertical, AlertTriangle, QrCode, Settings, Wifi, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import QRCode from 'qrcode';
import { whatsappService } from '@/services/whatsapp';
import { useAuth } from '@/contexts/AuthContext';

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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [newChip, setNewChip] = useState({
    name: '',
    phone_number: '',
    daily_limit: 100,
    priority: 1
  });
  const [editChip, setEditChip] = useState({
    name: '',
    phone_number: '',
    daily_limit: 100,
    priority: 1
  });
  const { toast } = useToast();
  const { user } = useAuth();

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
    if (!user) {
      toast({
        title: 'Erro',
        description: 'Usuário não autenticado',
        variant: 'destructive',
      });
      return;
    }

    setSelectedChip(chip);
    setConnectionStatus('connecting');
    setQrDialogOpen(true);
    setQrCode('');
    
    try {
      console.log('Iniciando conexão WhatsApp para chip:', chip.name);
      
      // Obter token de autenticação do Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Token de autenticação não encontrado');
      }

      // Chamar o edge function para iniciar conexão
      const response = await whatsappService.startConnection(chip.id, session.access_token);
      
      if (response.success && response.qrCode) {
        // Gerar QR code real a partir dos dados retornados
        const qrCodeDataUrl = await QRCode.toDataURL(response.qrCode, {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          },
          errorCorrectionLevel: 'M'
        });
        
        setQrCode(qrCodeDataUrl);
        setConnectionStatus('connected');
        
        console.log('QR Code gerado com sucesso para chip:', chip.name);
        
        // Simular escaneamento após 10 segundos para demonstração
        setTimeout(async () => {
          try {
            console.log('Simulando escaneamento do QR code...');
            await whatsappService.simulateScan(chip.id, session.access_token);
            
            // Atualizar status do chip
            await supabase
              .from('chips')
              .update({ status: 'active' })
              .eq('id', chip.id);
            
            fetchChips(); // Recarregar lista de chips
            setQrDialogOpen(false);
            
            toast({
              title: 'Sucesso',
              description: 'WhatsApp conectado com sucesso!',
            });
          } catch (error) {
            console.error('Erro ao simular scan:', error);
          }
        }, 10000);
        
        // Regenerar QR code a cada 30 segundos
        setTimeout(() => {
          if (connectionStatus !== 'failed') {
            startConnection(chip);
          }
        }, 30000);
        
      } else {
        throw new Error('Erro ao gerar QR code');
      }
      
    } catch (error: any) {
      console.error('Erro ao gerar QR code:', error);
      setConnectionStatus('failed');
      toast({
        title: 'Erro',
        description: 'Erro ao gerar QR code: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (chip: Chip) => {
    setSelectedChip(chip);
    setEditChip({
      name: chip.name,
      phone_number: chip.phone_number,
      daily_limit: chip.daily_limit,
      priority: chip.priority
    });
    setEditDialogOpen(true);
  };

  const updateChip = async () => {
    if (!selectedChip || !editChip.name.trim() || !editChip.phone_number.trim()) return;

    try {
      const { error } = await supabase
        .from('chips')
        .update({
          name: editChip.name,
          phone_number: editChip.phone_number,
          daily_limit: editChip.daily_limit,
          priority: editChip.priority
        })
        .eq('id', selectedChip.id);

      if (error) throw error;
      
      setEditDialogOpen(false);
      fetchChips();
      
      toast({
        title: 'Sucesso',
        description: 'Chip atualizado com sucesso!',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar chip: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const deleteChip = async (chipId: string) => {
    try {
      const { error } = await supabase
        .from('chips')
        .delete()
        .eq('id', chipId);

      if (error) throw error;
      
      fetchChips();
      
      toast({
        title: 'Sucesso',
        description: 'Chip excluído com sucesso!',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir chip: ' + error.message,
        variant: 'destructive',
      });
    }
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
          {chips.map((chip) => {
            const assignedQueue = queues.find(q => q.id === chip.queue_id);
            return (
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(chip)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. Isso excluirá permanentemente o chip "{chip.name}".
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteChip(chip.id)}>
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{chip.phone_number}</p>
                  {assignedQueue && (
                    <div className="flex items-center gap-2 mt-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: assignedQueue.color }}
                      />
                      <span className="text-sm text-muted-foreground">
                        Fila: {assignedQueue.name}
                      </span>
                    </div>
                  )}
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

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => startConnection(chip)}
                      >
                        <QrCode className="h-4 w-4 mr-2" />
                        QR Code
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => openConfigDialog(chip)}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Config
                      </Button>
                    </div>

                    <div className="pt-1">
                      <p className="text-xs text-muted-foreground">
                        Adicionado em {new Date(chip.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Conectar WhatsApp - {selectedChip?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {connectionStatus === 'connecting' && !qrCode && (
              <div className="flex flex-col items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
              </div>
            )}
            
            {qrCode && (
              <div className="flex flex-col items-center space-y-4">
                <div className="bg-white p-4 rounded-lg border">
                  <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                </div>
                <div className="text-center space-y-2">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                    <p className="text-sm text-blue-800 font-medium">🚀 WhatsApp Business Integration</p>
                    <p className="text-xs text-blue-700">Este QR code será conectado ao WhatsApp Business API. O sistema simulará a conexão após 10 segundos para demonstração. Em produção, seria necessário escanear com o WhatsApp Web real.</p>
                  </div>
                  <p className="text-sm font-medium">1. Abra o WhatsApp no seu celular</p>
                  <p className="text-sm text-muted-foreground">2. Toque em Menu ou Configurações</p>
                  <p className="text-sm text-muted-foreground">3. Toque em WhatsApp Web</p>
                  <p className="text-sm text-muted-foreground">4. Aponte seu celular para esta tela para capturar o código</p>
                </div>
                <div className="flex items-center gap-2 text-orange-600">
                  <Wifi className="h-4 w-4" />
                  <span className="text-sm">Aguardando conexão...</span>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Configuration Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurar - {selectedChip?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="queue">Fila de Atendimento</Label>
              <Select onValueChange={updateChipQueue}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma fila" />
                </SelectTrigger>
                <SelectContent>
                  {queues.map((queue) => (
                    <SelectItem key={queue.id} value={queue.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: queue.color }}
                        />
                        {queue.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                Mensagens recebidas neste chip serão direcionadas para a fila selecionada
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Chip Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Editar Chip - {selectedChip?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nome do Chip</Label>
              <Input
                id="edit-name"
                value={editChip.name}
                onChange={(e) => setEditChip({ ...editChip, name: e.target.value })}
                placeholder="Ex: Chip Principal, Chip Vendas..."
              />
            </div>
            <div>
              <Label htmlFor="edit-phone">Número do WhatsApp</Label>
              <Input
                id="edit-phone"
                value={editChip.phone_number}
                onChange={(e) => setEditChip({ ...editChip, phone_number: e.target.value })}
                placeholder="Ex: +5511999999999"
              />
            </div>
            <div>
              <Label htmlFor="edit-limit">Limite Diário de Mensagens</Label>
              <Input
                id="edit-limit"
                type="number"
                value={editChip.daily_limit}
                onChange={(e) => setEditChip({ ...editChip, daily_limit: parseInt(e.target.value) || 100 })}
                min="1"
              />
            </div>
            <div>
              <Label htmlFor="edit-priority">Prioridade</Label>
              <Input
                id="edit-priority"
                type="number"
                value={editChip.priority}
                onChange={(e) => setEditChip({ ...editChip, priority: parseInt(e.target.value) || 1 })}
                min="1"
                max="10"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={updateChip}>
                Salvar Alterações
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}