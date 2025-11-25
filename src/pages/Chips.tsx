import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QRCodeSVG } from 'qrcode.react';
import { Plus, Smartphone, Wifi, WifiOff, Download, Trash2, RotateCcw, Settings, Eye, Edit, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ChipStatusIndicator } from '@/components/ChipStatusIndicator';
import { ChipWarming } from '@/components/ChipWarming';
import { whatsappService } from '@/services/whatsapp';

interface Chip {
  id: string;
  name: string;
  phone_number: string;
  status: string;
  qr_code?: string;
  queue_id?: string;
  assigned_to?: string;
  evolution_instance_id?: string; // Nome da instância na Evolution API
  created_at: string;
  updated_at: string;
  created_by?: string;
  queues?: {
    name: string;
    color?: string;
  } | null;
  assigned_user?: {
    name: string;
    email: string;
  } | null;
}

interface User {
  user_id: string;
  name: string;
  email: string;
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
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone_number: '', queue_id: '', assigned_to: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [generatingQR, setGeneratingQR] = useState<string | null>(null);
  const [selectedChipQR, setSelectedChipQR] = useState<string | null>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [editingChip, setEditingChip] = useState<Chip | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [chipToDelete, setChipToDelete] = useState<string | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [availableInstances, setAvailableInstances] = useState<any[]>([]);
  const [isLoadingInstances, setIsLoadingInstances] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchChips();
    fetchQueues();
    fetchUsers();
    
    // Configurar Supabase Realtime para mudanças nos chips
    const channel = supabase
      .channel('chips-changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'chips'
        },
        (payload) => {
          console.log('🔄 Chip atualizado via Realtime:', payload);
          fetchChips(); // Recarregar lista quando houver mudanças
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchChips = async () => {
    try {
      console.log('🔍 Buscando chips no Supabase...');
      const { data, error } = await supabase
        .from('chips')
        .select(`
          *, 
          queues(name, color),
          assigned_user:profiles!chips_assigned_to_fkey(name, email)
        `)
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

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .order('name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar usuários: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const generateQRCode = async (chipId: string) => {
    setGeneratingQR(chipId);
    try {
      console.log('🔌 Iniciando conexão para chip:', chipId);
      
      const result = await whatsappService.startConnection(chipId);
      
      if (result.success) {
        toast({
          title: 'Sucesso',
          description: 'Conexão iniciada! O QR Code aparecerá em instantes.',
        });
      } else {
        throw new Error(result.error || 'Falha ao iniciar conexão');
      }
      
    } catch (error: any) {
      console.error('❌ Erro ao conectar chip:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao iniciar conexão',
        variant: 'destructive',
      });
    } finally {
      setGeneratingQR(null);
    }
  };

  const viewQRCode = async (chipId: string) => {
    try {
      const qrCode = await whatsappService.getQrCode(chipId);
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
      const result = await whatsappService.simulateScan(chipId);
      
      if (result.success) {
        toast({
          title: 'Sucesso',
          description: 'Chip desconectado com sucesso.',
        });
      } else {
        throw new Error(result.error || 'Falha ao desconectar');
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao desconectar chip',
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
          assigned_to: formData.assigned_to || null,
          status: 'inactive',
          created_by: user?.id
        });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Chip criado com sucesso!',
      });

      setIsDialogOpen(false);
      setFormData({ name: '', phone_number: '', queue_id: '', assigned_to: '' });
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
          queue_id: editingChip.queue_id || null,
          assigned_to: editingChip.assigned_to || null
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

  const handleImportClick = async () => {
    setIsLoadingInstances(true);
    setIsImportDialogOpen(true);
    
    try {
      const result = await whatsappService.listInstances();
      console.log('📋 Instâncias recebidas:', result);
      
      if (result.success && result.instances) {
        // Verificar estrutura dos dados
        console.log('📊 Estrutura das instâncias:', JSON.stringify(result.instances, null, 2));
        setAvailableInstances(result.instances);
      } else {
        toast({ 
          title: "Erro ao listar instâncias", 
          description: result.error || "Verifique a configuração da Evolution API",
          variant: "destructive" 
        });
        setAvailableInstances([]);
      }
    } catch (error) {
      console.error('❌ Erro ao listar instâncias:', error);
      toast({ 
        title: "Erro ao conectar com Evolution API", 
        variant: "destructive" 
      });
      setAvailableInstances([]);
    } finally {
      setIsLoadingInstances(false);
    }
  };

  const handleImportInstance = async (instance: any) => {
    try {
      console.log('📦 Importando instância:', instance);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Buscar company_id do usuário
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) {
        throw new Error('Empresa não encontrada para o usuário');
      }

      // A Evolution API pode retornar diferentes estruturas
      const instanceName = instance.instanceName || instance.instance?.instanceName || instance.name;
      const owner = instance.owner || instance.instance?.owner || 'Número não disponível';
      const state = instance.state || instance.instance?.state || 'disconnected';

      if (!instanceName) {
        throw new Error('Nome da instância não encontrado');
      }

      // Não especificar id - deixar o banco gerar UUID automaticamente
      // Armazenar o nome da instância da Evolution API no campo evolution_instance_id
      const { error } = await supabase.from("chips").insert({
        name: instanceName,
        phone_number: owner,
        evolution_instance_id: instanceName, // Nome real da instância na Evolution API
        status: state === 'open' ? 'connected' : 'disconnected',
        created_by: user.id,
        company_id: profile.company_id,
      });

      if (error) throw error;

      toast({ title: "Chip importado com sucesso!" });
      setIsImportDialogOpen(false);
      fetchChips();
    } catch (error: any) {
      console.error('❌ Erro ao importar:', error);
      toast({ 
        title: "Erro ao importar chip", 
        description: error.message,
        variant: "destructive" 
      });
    }
  };

  const getChipWithRealStatus = (chip: Chip) => {
    return {
      ...chip,
      realStatus: chip.status,
      isReady: chip.status === 'connected',
      hasQrCode: !!chip.qr_code
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-800';
      case 'disconnected': return 'bg-gray-100 text-gray-800';
      case 'connecting': return 'bg-yellow-100 text-yellow-800';
      case 'waiting_qr': return 'bg-blue-100 text-blue-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <Wifi className="h-4 w-4 text-green-600" />;
      case 'disconnected': return <WifiOff className="h-4 w-4 text-gray-600" />;
      case 'connecting': return <Wifi className="h-4 w-4 text-yellow-600 animate-pulse" />;
      case 'waiting_qr': return <Smartphone className="h-4 w-4 text-blue-600 animate-pulse" />;
      case 'error': return <WifiOff className="h-4 w-4 text-red-600" />;
      default: return <WifiOff className="h-4 w-4 text-gray-600" />;
    }
  };

  const filteredChips = chips.filter(chip => {
    const assignedUserName = chip.assigned_user?.name || '';
    const queueName = chip.queues?.name || '';
    const matchesSearch = chip.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         chip.phone_number.includes(searchTerm) ||
                         assignedUserName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         queueName.toLowerCase().includes(searchTerm.toLowerCase());
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleImportClick}>
            <Download className="h-4 w-4 mr-2" />
            Importar da Evolution API
          </Button>
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
                <Label>Atendente Direto (opcional)</Label>
                <Select value={formData.assigned_to} onValueChange={(value) => setFormData(prev => ({...prev, assigned_to: value === 'none' ? '' : value}))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um atendente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum atendente</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.user_id} value={user.user_id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Mensagens vão direto para o atendente selecionado
                </p>
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
                <p className="text-xs text-muted-foreground">
                  Usado apenas se nenhum atendente direto for selecionado
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">Cancelar</Button>
                <Button onClick={createChip} className="flex-1">Criar Chip</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
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
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Telefone: {chip.phone_number}</p>
                  
                  {chip.assigned_user && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">Atendente:</span>
                      <Badge variant="default" className="text-xs">
                        {chip.assigned_user.name}
                      </Badge>
                    </div>
                  )}
                  
                  {chip.queues && !chip.assigned_user && (
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
                    
                    {/* Condição original */}
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
                    
                    {/* Condição temporária para teste - mostra sempre quando há conexão */}
                    {!chipWithRealStatus.hasQrCode && chipWithRealStatus.realStatus !== 'disconnected' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => viewQRCode(chip.id)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Testar QR
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
                {chipWithRealStatus.realStatus === 'waiting_qr' && chipWithRealStatus.hasQrCode && (
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
              <Label>Atendente Direto (opcional)</Label>
              <Select 
                value={editingChip?.assigned_to || 'none'} 
                onValueChange={(value) => setEditingChip(prev => prev ? {...prev, assigned_to: value === 'none' ? '' : value} : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um atendente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum atendente</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Mensagens vão direto para o atendente selecionado
              </p>
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
              <p className="text-xs text-muted-foreground">
                Usado apenas se nenhum atendente direto for selecionado
              </p>
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

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Importar Chips da Evolution API</DialogTitle>
          </DialogHeader>
          
          {isLoadingInstances ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Carregando instâncias...</span>
            </div>
          ) : availableInstances.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma instância encontrada na Evolution API
            </div>
          ) : (
            <div className="space-y-3">
              {availableInstances.map((instance: any, index: number) => {
                // Suportar diferentes estruturas de dados da Evolution API
                const instanceName = instance.instanceName || instance.instance?.instanceName || instance.name || `instance-${index}`;
                const state = instance.state || instance.instance?.state || 'unknown';
                const owner = instance.owner || instance.instance?.owner;
                
                return (
                  <Card key={instanceName} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{instanceName}</div>
                        <div className="text-sm text-muted-foreground">
                          Status: {state === 'open' ? '🟢 Conectado' : '🔴 Desconectado'}
                        </div>
                        {owner && (
                          <div className="text-sm text-muted-foreground">
                            Número: {owner}
                          </div>
                        )}
                      </div>
                      <Button onClick={() => handleImportInstance(instance)}>
                        Importar
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}