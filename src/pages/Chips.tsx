import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { QRCodeSVG } from 'qrcode.react';
import { Plus, Smartphone, Wifi, WifiOff, QrCode, Settings, Pencil, Trash2, AlertTriangle, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ChipWarming } from '@/components/ChipWarming';
import { whatsappService } from '@/services/whatsapp';
import { useToast } from '@/hooks/use-toast';
import { useWhatsAppWebSocket } from '@/hooks/useWhatsAppWebSocket';
import { useMultipleChips } from '@/hooks/useMultipleChips';

interface Chip {
  id: string;
  name: string;
  phone_number: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'qr_generated' | 'error' | 'warming' | 'maintenance';
  priority: number;
  daily_limit: number;
  monthly_limit?: number;
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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [newChip, setNewChip] = useState({
    name: '',
    phone_number: '',
    daily_limit: 500,
    monthly_limit: 15000,
    priority: 1
  });
  const [editingChip, setEditingChip] = useState<Chip | null>(null);
  const [selectedQueueId, setSelectedQueueId] = useState<string>('');
  const { toast } = useToast();

  // Hook para gerenciar múltiplos chips
  const { 
    connections, 
    connectChip, 
    disconnectChip, 
    getQrCode, 
    getChipStatus, 
    getConnectionStats,
    fetchAllConnections 
  } = useMultipleChips();

  // WebSocket para o chip selecionado
  const { connected: wsConnected } = useWhatsAppWebSocket({
    chipId: selectedChip?.id,
    onQrCode: (qr) => {
      setQrCode(qr);
      console.log('QR Code recebido via WebSocket');
    },
    onStatusChange: (status) => {
      console.log(`Status do chip ${selectedChip?.id}: ${status}`);
      fetchAllConnections(); // Atualizar lista de conexões
    },
    onMessageReceived: (message) => {
      console.log('Mensagem recebida:', message);
      toast({
        title: '💬 Nova mensagem',
        description: `De ${message.from}: ${message.message}`,
      });
    },
    onConnected: () => {
      toast({
        title: '✅ Conectado',
        description: `Chip ${selectedChip?.name} conectado com sucesso!`,
      });
    },
    onDisconnected: () => {
      toast({
        title: '❌ Desconectado',
        description: `Chip ${selectedChip?.name} foi desconectado`,
        variant: 'destructive',
      });
    }
  });

  useEffect(() => {
    fetchChips();
    fetchQueues();
  }, []);

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

  const fetchQueues = async () => {
    try {
      const { data, error } = await supabase
        .from('queues')
        .select('*')
        .order('name');

      if (error) throw error;
      setQueues((data as Queue[]) || []);
    } catch (error: any) {
      console.error('Erro ao buscar filas:', error);
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
          monthly_limit: newChip.monthly_limit,
          priority: newChip.priority,
          status: 'disconnected',
          current_usage: 0
        });

      if (error) throw error;
      
      setDialogOpen(false);
      setNewChip({ name: '', phone_number: '', daily_limit: 500, monthly_limit: 15000, priority: 1 });
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
    setQrCode('');
    setQrDialogOpen(true);

    try {
      console.log(`Iniciando conexão para chip: ${chip.id}`);
      
      // Usar o hook de múltiplos chips
      await connectChip(chip.id);
      
      // Tentar obter QR Code imediatamente
      setTimeout(async () => {
        const qr = await getQrCode(chip.id);
        if (qr) {
          setQrCode(qr);
        }
      }, 2000);
      
    } catch (error: any) {
      console.error('Erro ao iniciar conexão:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao iniciar conexão: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (chip: Chip) => {
    setEditingChip(chip);
    setEditDialogOpen(true);
  };

  const updateChip = async () => {
    if (!editingChip) return;

    try {
      const { error } = await supabase
        .from('chips')
        .update({
          name: editingChip.name,
          phone_number: editingChip.phone_number,
          daily_limit: editingChip.daily_limit,
          monthly_limit: editingChip.monthly_limit,
          priority: editingChip.priority
        })
        .eq('id', editingChip.id);

      if (error) throw error;
      
      setEditDialogOpen(false);
      setEditingChip(null);
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
        description: 'Chip removido com sucesso!',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao remover chip: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const openConfigDialog = (chip: Chip) => {
    setSelectedChip(chip);
    setSelectedQueueId(chip.queue_id || '');
    setConfigDialogOpen(true);
  };

  const updateChipQueue = async (queueId: string) => {
    if (!selectedChip) return;

    try {
      const { error } = await supabase
        .from('chips')
        .update({ queue_id: queueId || null })
        .eq('id', selectedChip.id);

      if (error) throw error;
      
      setConfigDialogOpen(false);
      setSelectedChip(null);
      setSelectedQueueId('');
      fetchChips();
      
      toast({
        title: 'Sucesso',
        description: 'Configuração salva com sucesso!',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar configuração: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400';
      case 'connecting': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400';
      case 'qr_generated': return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400';
      case 'disconnected': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400';
      case 'error': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400';
      case 'warming': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'maintenance': return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'connected': return 'Conectado';
      case 'connecting': return 'Conectando';
      case 'qr_generated': return 'QR Code Gerado';
      case 'disconnected': return 'Desconectado';
      case 'error': return 'Erro';
      case 'warming': return 'Aquecendo';
      case 'maintenance': return 'Manutenção';
      default: return 'Desconhecido';
    }
  };

  // Combinar status do banco com status do servidor
  const getChipDisplayStatus = (chip: Chip) => {
    const serverStatus = getChipStatus(chip.id);
    return serverStatus ? serverStatus.status : chip.status;
  };

  // Estatísticas das conexões
  const connectionStats = getConnectionStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Chip Warming Component */}
      <ChipWarming />
      
      {/* Estatísticas de Conexão */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Total</span>
            </div>
            <p className="text-2xl font-bold">{connectionStats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Wifi className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Conectados</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{connectionStats.connected}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <QrCode className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Conectando</span>
            </div>
            <p className="text-2xl font-bold text-orange-600">{connectionStats.connecting}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <WifiOff className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium">Desconectados</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{connectionStats.disconnected}</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Chips WhatsApp</h1>
          <p className="text-muted-foreground">Gerencie seus chips de WhatsApp</p>
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
                  placeholder="Ex: Vendas 1"
                />
              </div>
              <div>
                <Label htmlFor="phone">Número WhatsApp</Label>
                <Input
                  id="phone"
                  value={newChip.phone_number}
                  onChange={(e) => setNewChip({ ...newChip, phone_number: e.target.value })}
                  placeholder="Ex: 5511999999999"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dailyLimit">Limite Diário</Label>
                  <Input
                    id="dailyLimit"
                    type="number"
                    value={newChip.daily_limit}
                    onChange={(e) => setNewChip({ ...newChip, daily_limit: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="monthlyLimit">Limite Mensal</Label>
                  <Input
                    id="monthlyLimit"
                    type="number"
                    value={newChip.monthly_limit}
                    onChange={(e) => setNewChip({ ...newChip, monthly_limit: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="priority">Prioridade</Label>
                <Select value={newChip.priority.toString()} onValueChange={(value) => setNewChip({ ...newChip, priority: parseInt(value) })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Alta (1)</SelectItem>
                    <SelectItem value="2">Média (2)</SelectItem>
                    <SelectItem value="3">Baixa (3)</SelectItem>
                  </SelectContent>
                </Select>
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
            <h3 className="text-lg font-semibold mb-2">Nenhum chip encontrado</h3>
            <p className="text-muted-foreground text-center mb-4">
              Adicione seu primeiro chip WhatsApp para começar
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
                    <div>
                      <CardTitle className="text-lg">{chip.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{chip.phone_number}</p>
                    </div>
                  </div>
                  <Badge 
                    className={`${getStatusColor(getChipDisplayStatus(chip))} border`}
                  >
                    {getStatusLabel(getChipDisplayStatus(chip))}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Uso Diário</span>
                      <span className="text-sm text-muted-foreground">
                        {chip.current_usage || 0} / {chip.daily_limit}
                      </span>
                    </div>
                    <Progress 
                      value={chip.daily_limit > 0 ? ((chip.current_usage || 0) / chip.daily_limit) * 100 : 0} 
                      className="h-2"
                    />
                  </div>

                  {/* Priority */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Prioridade:</span>
                    <Badge variant="outline">
                      {chip.priority === 1 ? 'Alta' : chip.priority === 2 ? 'Média' : 'Baixa'}
                    </Badge>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {getChipDisplayStatus(chip) === 'connected' ? (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => disconnectChip(chip.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <WifiOff className="h-4 w-4 mr-1" />
                        Desconectar
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => startConnection(chip)}
                      >
                        <QrCode className="h-4 w-4 mr-1" />
                        QR Code
                      </Button>
                    )}
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => openConfigDialog(chip)}
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      Config
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => openEditDialog(chip)}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => deleteChip(chip.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp - {selectedChip?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            
            {qrCode && (
              <div className="text-center space-y-4">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200 dark:bg-green-900/20 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Wifi className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-800 dark:text-green-200">
                      ✅ QR CODE REAL - WhatsApp Pronto!
                    </span>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Use seu WhatsApp para escanear este QR Code e conectar o chip.
                  </p>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  📱 Escaneie este QR Code com seu WhatsApp
                </p>
                <div className="flex justify-center">
                  <QRCodeSVG value={qrCode} size={256} />
                </div>
                
                <div className="bg-blue-50 p-3 rounded-md text-xs text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
                  <div className="font-medium mb-2">📋 Instruções:</div>
                  <ul className="space-y-1 text-left">
                    <li>• Abra WhatsApp → Menu → Dispositivos Conectados</li>
                    <li>• Toque em "Conectar dispositivo"</li>
                    <li>• Escaneie o QR Code acima</li>
                    <li>• Aguarde a confirmação de conexão</li>
                  </ul>
                </div>
              </div>
            )}

            {!qrCode && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-sm text-muted-foreground">
                  Gerando QR Code... Aguarde alguns segundos.
                </p>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setQrDialogOpen(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Config Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar Chip - {selectedChip?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="queue">Fila de Atendimento</Label>
              <Select value={selectedQueueId} onValueChange={setSelectedQueueId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar fila" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhuma fila</SelectItem>
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
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => updateChipQueue(selectedQueueId)}>
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Chip</DialogTitle>
          </DialogHeader>
          {editingChip && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="editName">Nome do Chip</Label>
                <Input
                  id="editName"
                  value={editingChip.name}
                  onChange={(e) => setEditingChip({ ...editingChip, name: e.target.value })}
                  placeholder="Ex: Vendas 1"
                />
              </div>
              <div>
                <Label htmlFor="editPhone">Número WhatsApp</Label>
                <Input
                  id="editPhone"
                  value={editingChip.phone_number}
                  onChange={(e) => setEditingChip({ ...editingChip, phone_number: e.target.value })}
                  placeholder="Ex: 5511999999999"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editDailyLimit">Limite Diário</Label>
                  <Input
                    id="editDailyLimit"
                    type="number"
                    value={editingChip.daily_limit}
                    onChange={(e) => setEditingChip({ ...editingChip, daily_limit: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="editMonthlyLimit">Limite Mensal</Label>
                  <Input
                    id="editMonthlyLimit"
                    type="number"
                    value={editingChip.monthly_limit}
                    onChange={(e) => setEditingChip({ ...editingChip, monthly_limit: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="editPriority">Prioridade</Label>
                <Select 
                  value={editingChip.priority.toString()} 
                  onValueChange={(value) => setEditingChip({ ...editingChip, priority: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Alta (1)</SelectItem>
                    <SelectItem value="2">Média (2)</SelectItem>
                    <SelectItem value="3">Baixa (3)</SelectItem>
                  </SelectContent>
                </Select>
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}