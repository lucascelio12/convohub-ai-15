import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QRCodeSVG } from 'qrcode.react';
import { Plus, Smartphone, Wifi, WifiOff, Download, Trash2, RotateCcw, Settings, Eye, Edit, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useMultipleChips } from '@/hooks/useMultipleChips';
import { useWhatsAppRealTime } from '@/hooks/useWhatsAppRealTime';
import { ChipStatusIndicator } from '@/components/ChipStatusIndicator';
import { ChipWarming } from '@/components/ChipWarming';

interface Chip {
  id: string;
  name: string;
  phone_number: string;
  status: string;
  qr_code?: string;
  queue_id?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  queues?: {
    name: string;
    color?: string;
  } | null;
}

interface Queue {
  id: string;
  name: string;
  description?: string;
  color?: string;
}

export default function Chips() {
  const [chips, setChips] = useState<Chip[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone_number: '', queue_id: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [generatingQR, setGeneratingQR] = useState<string | null>(null);
  const [selectedChipQR, setSelectedChipQR] = useState<string | null>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [editingChip, setEditingChip] = useState<Chip | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [chipToDelete, setChipToDelete] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Hooks para conexões reais
  const { 
    connections, 
    connectChip, 
    disconnectChip, 
    getQrCode, 
    sendMessage,
    getChipStatus 
  } = useMultipleChips();
  
  const { connected: wsConnected, connectionStatuses } = useWhatsAppRealTime();

  useEffect(() => {
    fetchChips();
    fetchQueues();
  }, []);

  const fetchChips = async () => {
    try {
      console.log('🔍 Buscando chips no Supabase...');
      const { data, error } = await supabase
        .from('chips')
        .select('*, queues(name, color)')
        .order('created_at', { ascending: false });

      console.log('📊 Resultado da query chips:', { data, error });
      if (error) throw error;
      console.log('✅ Chips encontrados:', data?.length || 0);
      setChips(data || []);
    } catch (error: any) {
      console.error('❌ Erro ao buscar chips:', error);
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
        .select('id, name, description, color')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setQueues(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar filas: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const generateQRCode = async (chipId: string) => {
    setGeneratingQR(chipId);
    try {
      console.log('Iniciando conexão para chip:', chipId);
      
      // Conectar via servidor real ou simulado
      await connectChip(chipId);
      
      toast({
        title: 'Sucesso',
        description: 'Processo de conexão iniciado! O QR Code aparecerá em instantes.',
      });

      // Para simulação local, forçar atualização do status após um tempo
      setTimeout(() => {
        console.log('Verificando status do chip após conexão:', chipId);
      }, 3000);
      
    } catch (error: any) {
      console.error('Erro ao conectar chip:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao iniciar conexão: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setGeneratingQR(null);
    }
  };

  const viewQRCode = async (chipId: string) => {
    try {
      const qrCode = await getQrCode(chipId);
      if (qrCode) {
        setSelectedChipQR(qrCode);
        setQrDialogOpen(true);
      } else {
        toast({
          title: 'QR Code não disponível',
          description: 'Inicie a conexão primeiro para gerar o QR Code.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao obter QR Code: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDisconnect = async (chipId: string) => {
    try {
      await disconnectChip(chipId);
      toast({
        title: 'Sucesso',
        description: 'Chip desconectado com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao desconectar chip: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const createChip = async () => {
    if (!formData.name.trim() || !formData.phone_number.trim()) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('chips')
        .insert({
          name: formData.name,
          phone_number: formData.phone_number,
          queue_id: formData.queue_id || null,
          status: 'inactive',
          created_by: user?.id
        });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Chip criado com sucesso!',
      });

      setIsDialogOpen(false);
      setFormData({ name: '', phone_number: '', queue_id: '' });
      fetchChips();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao criar chip: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const editChip = async () => {
    if (!editingChip || !editingChip.name.trim() || !editingChip.phone_number.trim()) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('chips')
        .update({
          name: editingChip.name,
          phone_number: editingChip.phone_number,
          queue_id: editingChip.queue_id || null
        })
        .eq('id', editingChip.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Chip atualizado com sucesso!',
      });

      setEditDialogOpen(false);
      setEditingChip(null);
      fetchChips();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar chip: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const deleteChip = async () => {
    if (!chipToDelete) return;

    try {
      const { error } = await supabase
        .from('chips')
        .delete()
        .eq('id', chipToDelete);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Chip excluído com sucesso!',
      });

      setDeleteConfirmOpen(false);
      setChipToDelete(null);
      fetchChips();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir chip: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  // Combinar dados do Supabase com status real das conexões
  const getChipWithRealStatus = (chip: Chip) => {
    const realConnection = connections.find(conn => conn.chipId === chip.id);
    const wsStatus = connectionStatuses.find(status => status.chipId === chip.id);
    
    return {
      ...chip,
      realStatus: realConnection?.status || wsStatus?.status || 'disconnected',
      isReady: realConnection?.isReady || wsStatus?.isReady || false,
      hasQrCode: realConnection?.hasQrCode || false
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'connecting': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Wifi className="h-4 w-4 text-green-600" />;
      case 'inactive': return <WifiOff className="h-4 w-4 text-gray-600" />;
      case 'connecting': return <Wifi className="h-4 w-4 text-yellow-600 animate-pulse" />;
      case 'error': return <WifiOff className="h-4 w-4 text-red-600" />;
      default: return <WifiOff className="h-4 w-4 text-gray-600" />;
    }
  };

  const filteredChips = chips.filter(chip => {
    const matchesSearch = chip.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         chip.phone_number.includes(searchTerm);
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && chip.status === statusFilter;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <ChipWarming />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Chips WhatsApp</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus chips e conexões WhatsApp</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo Chip</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Chip</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Chip</Label>
                <Input
                  placeholder="Ex: WhatsApp Principal"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                />
              </div>
              <div className="space-y-2">
                <Label>Número de Telefone</Label>
                <Input
                  placeholder="Ex: 5511999999999"
                  value={formData.phone_number}
                  onChange={(e) => setFormData(prev => ({...prev, phone_number: e.target.value}))}
                />
              </div>
              <div className="space-y-2">
                <Label>Fila (opcional)</Label>
                <Select value={formData.queue_id} onValueChange={(value) => setFormData(prev => ({...prev, queue_id: value === 'none' ? '' : value}))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma fila" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma fila</SelectItem>
                    {queues.map((queue) => (
                      <SelectItem key={queue.id} value={queue.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: queue.color || '#3B82F6' }}
                          />
                          {queue.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">Cancelar</Button>
                <Button onClick={createChip} className="flex-1">Criar Chip</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4 items-center">
        <Input
          placeholder="Buscar chips..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
            <SelectItem value="connecting">Conectando</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredChips.map((chip) => {
          const chipWithRealStatus = getChipWithRealStatus(chip);
          
          return (
            <Card key={chip.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    {chip.name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <ChipStatusIndicator 
                      status={chipWithRealStatus.realStatus} 
                      isReady={chipWithRealStatus.isReady}
                      size="sm"
                    />
                    {!wsConnected && (
                      <Badge variant="outline" className="text-xs">
                        Offline
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Telefone: {chip.phone_number}</p>
                  {chip.queues && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">Fila:</span>
                      <Badge 
                        variant="outline" 
                        className="text-xs"
                        style={{ 
                          backgroundColor: chip.queues.color + '20', 
                          borderColor: chip.queues.color,
                          color: chip.queues.color 
                        }}
                      >
                        {chip.queues.name}
                      </Badge>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">Criado: {new Date(chip.created_at).toLocaleDateString('pt-BR')}</p>
                  <p className="text-xs text-muted-foreground">Status Real: {chipWithRealStatus.realStatus}</p>
                </div>

                {/* Botões de ação */}
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {chipWithRealStatus.realStatus === 'disconnected' && (
                      <Button 
                        size="sm" 
                        onClick={() => generateQRCode(chip.id)}
                        disabled={generatingQR === chip.id}
                      >
                        {generatingQR === chip.id ? 'Conectando...' : 'Conectar'}
                      </Button>
                    )}
                    
                    {chipWithRealStatus.hasQrCode && chipWithRealStatus.realStatus === 'qr_ready' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => viewQRCode(chip.id)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Ver QR
                      </Button>
                    )}
                    
                    {chipWithRealStatus.realStatus === 'connected' && (
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleDisconnect(chip.id)}
                      >
                        Desconectar
                      </Button>
                    )}
                    
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => generateQRCode(chip.id)}
                      disabled={generatingQR === chip.id}
                    >
                      <RotateCcw className={`h-3 w-3 mr-1 ${generatingQR === chip.id ? 'animate-spin' : ''}`} />
                      Renovar
                    </Button>
                  </div>
                  
                  {/* Botões de editar e excluir */}
                  <div className="flex gap-2 border-t pt-2">
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => {
                        setEditingChip(chip);
                        setEditDialogOpen(true);
                      }}
                      className="flex-1"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setChipToDelete(chip.id);
                        setDeleteConfirmOpen(true);
                      }}
                      className="flex-1 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Excluir
                    </Button>
                  </div>
                </div>

                {/* Status da conexão real */}
                {wsConnected && chipWithRealStatus.realStatus === 'qr_ready' && (
                  <div className="border rounded-lg p-3 bg-blue-50 border-blue-200">
                    <p className="text-sm text-blue-800 text-center">
                      📱 QR Code disponível! Clique em "Ver QR" para escanear.
                    </p>
                  </div>
                )}

                {chipWithRealStatus.realStatus === 'connected' && (
                  <div className="border rounded-lg p-3 bg-green-50 border-green-200">
                    <p className="text-sm text-green-800 text-center">
                      ✅ Chip conectado e pronto para uso!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialog para exibir QR Code */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Escanear QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            {selectedChipQR && (
              <div className="bg-white p-4 rounded-lg border">
                <img 
                  src={selectedChipQR} 
                  alt="QR Code WhatsApp" 
                  className="w-64 h-64"
                />
              </div>
            )}
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                1. Abra o WhatsApp no seu telefone
              </p>
              <p className="text-sm text-muted-foreground">
                2. Toque em Mais opções → Aparelhos conectados
              </p>
              <p className="text-sm text-muted-foreground">
                3. Toque em "Conectar um aparelho"
              </p>
              <p className="text-sm text-muted-foreground">
                4. Escaneie este código QR
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setQrDialogOpen(false)}
              className="w-full"
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para editar chip */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Chip</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Chip</Label>
              <Input
                placeholder="Ex: WhatsApp Principal"
                value={editingChip?.name || ''}
                onChange={(e) => setEditingChip(prev => prev ? {...prev, name: e.target.value} : null)}
              />
            </div>
            <div className="space-y-2">
              <Label>Número de Telefone</Label>
              <Input
                placeholder="Ex: 5511999999999"
                value={editingChip?.phone_number || ''}
                onChange={(e) => setEditingChip(prev => prev ? {...prev, phone_number: e.target.value} : null)}
              />
            </div>
            <div className="space-y-2">
              <Label>Fila (opcional)</Label>
              <Select 
                value={editingChip?.queue_id || 'none'} 
                onValueChange={(value) => setEditingChip(prev => prev ? {...prev, queue_id: value === 'none' ? '' : value} : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma fila" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma fila</SelectItem>
                  {queues.map((queue) => (
                    <SelectItem key={queue.id} value={queue.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: queue.color || '#3B82F6' }}
                        />
                        {queue.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setEditDialogOpen(false);
                  setEditingChip(null);
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button onClick={editChip} className="flex-1">
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar Exclusão
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja excluir este chip? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setChipToDelete(null);
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={deleteChip}
                className="flex-1"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Excluir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}