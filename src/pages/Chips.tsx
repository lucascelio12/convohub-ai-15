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
import { Plus, Smartphone, Wifi, WifiOff, QrCode, Settings, Pencil, Trash2, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ChipWarming } from '@/components/ChipWarming';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Chip {
  id: string;
  name: string;
  phone_number: string;
  status: string;
  qr_code?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface Queue {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export default function Chips() {
  const { user } = useAuth();
  const [chips, setChips] = useState<Chip[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedChip, setSelectedChip] = useState<Chip | null>(null);
  const [qrCode, setQrCode] = useState<string>('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [newChip, setNewChip] = useState({
    name: '',
    phone_number: '',
  });
  const [editingChip, setEditingChip] = useState<Chip | null>(null);
  const { toast } = useToast();

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
      setChips(data || []);
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
      setQueues(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar filas:', error);
    }
  };

  const createChip = async () => {
    if (!newChip.name.trim() || !newChip.phone_number.trim() || !user?.id) return;

    try {
      const { error } = await supabase
        .from('chips')
        .insert({
          name: newChip.name,
          phone_number: newChip.phone_number,
          status: 'active',
          created_by: user.id
        });

      if (error) throw error;
      
      setDialogOpen(false);
      setNewChip({ name: '', phone_number: '' });
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
    setQrCode('sample-qr-code-data');
    setQrDialogOpen(true);
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
    if (!confirm('Tem certeza que deseja excluir este chip?')) return;

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400';
      case 'inactive': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'inactive': return 'Inativo';
      default: return 'Desconhecido';
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
      {/* Chip Warming Component */}
      <ChipWarming />
      
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
                  <Badge className={`${getStatusColor(chip.status)} border`}>
                    {getStatusLabel(chip.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Action Buttons */}
                  <div className="flex gap-2 flex-wrap">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => startConnection(chip)}
                    >
                      <QrCode className="h-4 w-4 mr-1" />
                      QR Code
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
                <p className="text-sm text-muted-foreground">
                  📱 Escaneie este QR Code com seu WhatsApp
                </p>
                <div className="flex justify-center">
                  <QRCodeSVG value={qrCode} size={256} />
                </div>
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