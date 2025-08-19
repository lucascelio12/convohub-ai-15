import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QRCodeSVG } from 'qrcode.react';
import { Plus, Smartphone, Wifi, WifiOff, Download, Trash2, RotateCcw, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Chip {
  id: string;
  name: string;
  phone_number: string;
  status: string;
  qr_code?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export default function Chips() {
  const [chips, setChips] = useState<Chip[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone_number: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [generatingQR, setGeneratingQR] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchChips();
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

  const generateQRCode = async (chipId: string) => {
    setGeneratingQR(chipId);
    try {
      const qrData = `whatsapp-chip:${chipId}:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
      
      const { error } = await supabase
        .from('chips')
        .update({ qr_code: qrData, status: 'connecting' })
        .eq('id', chipId);

      if (error) throw error;
      
      toast({
        title: 'Sucesso',
        description: 'QR Code gerado! Escaneie com WhatsApp para conectar.',
      });
      fetchChips();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao gerar QR Code: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setGeneratingQR(null);
    }
  };

  const createChip = async () => {
    if (!formData.name.trim() || !formData.phone_number.trim()) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos.',
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
          status: 'inactive',
          created_by: user?.id
        });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Chip criado com sucesso!',
      });

      setIsDialogOpen(false);
      setFormData({ name: '', phone_number: '' });
      fetchChips();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao criar chip: ' + error.message,
        variant: 'destructive',
      });
    }
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
        {filteredChips.map((chip) => (
          <Card key={chip.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  {chip.name}
                </CardTitle>
                {getStatusIcon(chip.status)}
              </div>
              <Badge className={`w-fit ${getStatusColor(chip.status)}`}>
                {chip.status === 'active' ? 'Ativo' : chip.status === 'inactive' ? 'Inativo' : chip.status === 'connecting' ? 'Conectando' : 'Erro'}
              </Badge>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Telefone: {chip.phone_number}</p>
                <p className="text-xs text-muted-foreground">Criado: {new Date(chip.created_at).toLocaleDateString('pt-BR')}</p>
              </div>

              {chip.qr_code ? (
                <div className="border rounded-lg p-4 bg-muted/20">
                  <div className="flex flex-col items-center space-y-3">
                    <div className="bg-white p-3 rounded-lg">
                      <QRCodeSVG value={chip.qr_code} size={120} />
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => generateQRCode(chip.id)}
                      disabled={generatingQR === chip.id}
                    >
                      <RotateCcw className={`h-3 w-3 mr-1 ${generatingQR === chip.id ? 'animate-spin' : ''}`} />
                      Renovar QR
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border rounded-lg p-4 bg-muted/20 text-center">
                  <Smartphone className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium">QR Code não gerado</p>
                  <Button 
                    size="sm" 
                    onClick={() => generateQRCode(chip.id)}
                    disabled={generatingQR === chip.id}
                    className="mt-2"
                  >
                    {generatingQR === chip.id ? 'Gerando...' : 'Gerar QR Code'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}