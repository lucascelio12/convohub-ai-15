import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Send, Users, MessageSquare, MoreVertical, Play, Pause, Edit, Trash2, Upload, FileText, FileSpreadsheet, Smartphone } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Campaign {
  id: string;
  name: string;
  message_template: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  total_contacts: number;
  sent_count: number;
  success_count: number;
  created_at: string;
  chips?: Chip[];
}

interface Chip {
  id: string;
  name: string;
  phone_number: string;
  status: string;
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [chips, setChips] = useState<Chip[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    message_template: '',
    selectedChips: [] as string[]
  });
  const [editCampaign, setEditCampaign] = useState({
    name: '',
    message_template: '',
    selectedChips: [] as string[]
  });
  const [importData, setImportData] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMethod, setImportMethod] = useState<'text' | 'file'>('text');
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchCampaigns();
    fetchChips();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          campaign_chips (
            chip_id,
            chips (
              id,
              name,
              phone_number,
              status
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Organizar os dados dos chips
      const campaignsWithChips = (data || []).map((campaign: any) => ({
        ...campaign,
        chips: campaign.campaign_chips?.map((cc: any) => cc.chips) || []
      }));
      
      setCampaigns(campaignsWithChips as Campaign[]);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar campanhas: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchChips = async () => {
    try {
      const { data, error } = await supabase
        .from('chips')
        .select('id, name, phone_number, status')
        .neq('status', 'inactive')
        .order('name');

      if (error) throw error;
      setChips((data as Chip[]) || []);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar chips: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const createCampaign = async () => {
    if (!newCampaign.name.trim() || !newCampaign.message_template.trim()) return;
    
    if (newCampaign.selectedChips.length === 0) {
      toast({
        title: 'Erro',
        description: 'Selecione pelo menos um chip para a campanha.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Criar campanha
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          name: newCampaign.name,
          message_template: newCampaign.message_template,
          created_by: user?.id || ''
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Associar chips à campanha
      if (campaignData && newCampaign.selectedChips.length > 0) {
        const chipAssociations = newCampaign.selectedChips.map(chipId => ({
          campaign_id: campaignData.id,
          chip_id: chipId
        }));

        const { error: chipsError } = await supabase
          .from('campaign_chips')
          .insert(chipAssociations);

        if (chipsError) throw chipsError;
      }
      
      setDialogOpen(false);
      setNewCampaign({ name: '', message_template: '', selectedChips: [] });
      fetchCampaigns();
      
      toast({
        title: 'Sucesso',
        description: 'Campanha criada com sucesso!',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao criar campanha: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const updateCampaign = async () => {
    if (!selectedCampaign || !editCampaign.name.trim() || !editCampaign.message_template.trim()) return;
    
    if (editCampaign.selectedChips.length === 0) {
      toast({
        title: 'Erro',
        description: 'Selecione pelo menos um chip para a campanha.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Atualizar campanha
      const { error: campaignError } = await supabase
        .from('campaigns')
        .update({
          name: editCampaign.name,
          message_template: editCampaign.message_template,
        })
        .eq('id', selectedCampaign.id);

      if (campaignError) throw campaignError;

      // Remover associações antigas
      await supabase
        .from('campaign_chips')
        .delete()
        .eq('campaign_id', selectedCampaign.id);

      // Criar novas associações
      if (editCampaign.selectedChips.length > 0) {
        const chipAssociations = editCampaign.selectedChips.map(chipId => ({
          campaign_id: selectedCampaign.id,
          chip_id: chipId
        }));

        const { error: chipsError } = await supabase
          .from('campaign_chips')
          .insert(chipAssociations);

        if (chipsError) throw chipsError;
      }
      
      setEditDialogOpen(false);
      setSelectedCampaign(null);
      setEditCampaign({ name: '', message_template: '', selectedChips: [] });
      fetchCampaigns();
      
      toast({
        title: 'Sucesso',
        description: 'Campanha atualizada com sucesso!',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar campanha: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const deleteCampaign = async (campaignId: string) => {
    try {
      // First delete campaign contacts
      await supabase
        .from('campaign_contacts')
        .delete()
        .eq('campaign_id', campaignId);

      // Then delete campaign
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;
      
      fetchCampaigns();
      
      toast({
        title: 'Sucesso',
        description: 'Campanha excluída com sucesso!',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir campanha: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setEditCampaign({
      name: campaign.name,
      message_template: campaign.message_template,
      selectedChips: campaign.chips?.map(chip => chip.id) || []
    });
    setEditDialogOpen(true);
  };

  const handleImportContacts = (campaign: Campaign) => {
    console.log('Opening import dialog for campaign:', campaign.name);
    setSelectedCampaign(campaign);
    setImportDialogOpen(true);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportFile(file);

    // Process Excel file
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
        
        // Convert to text format for processing
        const textData = jsonData.map(row => {
          // Ensure we have at least name and phone
          if (row.length >= 2) {
            return row.slice(0, 3).join(', '); // Name, Phone, Message (optional)
          }
          return '';
        }).filter(line => line.trim() !== '').join('\n');
        
        setImportData(textData);
        
        toast({
          title: 'Arquivo carregado',
          description: `${jsonData.length} linhas encontradas no arquivo`,
        });
      } catch (error: any) {
        toast({
          title: 'Erro',
          description: 'Erro ao processar arquivo Excel: ' + error.message,
          variant: 'destructive',
        });
      }
    };
    
    reader.readAsArrayBuffer(file);
  };

  const importContacts = async () => {
    if (!selectedCampaign || (!importData.trim() && !importFile)) return;

    try {
      const lines = importData.trim().split('\n');
      const contacts = [];
      
      for (const line of lines) {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length >= 2) {
          contacts.push({
            campaign_id: selectedCampaign.id,
            name: parts[0],
            phone_number: parts[1],
            custom_message: parts[2] || null,
          });
        }
      }

      if (contacts.length === 0) {
        toast({
          title: 'Erro',
          description: 'Nenhum contato válido encontrado',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('campaign_contacts')
        .insert(contacts);

      if (error) throw error;

      // Update total contacts count
      await supabase
        .from('campaigns')
        .update({ total_contacts: contacts.length })
        .eq('id', selectedCampaign.id);
      
      setImportDialogOpen(false);
      setImportData('');
      setImportFile(null);
      setImportMethod('text');
      setSelectedCampaign(null);
      fetchCampaigns();
      
      toast({
        title: 'Sucesso',
        description: `${contacts.length} contatos importados com sucesso!`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao importar contatos: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Rascunho';
      case 'active': return 'Ativa';
      case 'paused': return 'Pausada';
      case 'completed': return 'Finalizada';
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
          <h1 className="text-3xl font-bold">Campanhas</h1>
          <p className="text-muted-foreground">Gerencie suas campanhas de marketing</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Campanha
            </Button>
          </DialogTrigger>
            <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Criar Nova Campanha</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nome da Campanha</Label>
                <Input
                  id="name"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  placeholder="Ex: Promoção Black Friday"
                />
              </div>
              <div>
                <Label htmlFor="message">Mensagem</Label>
                <Textarea
                  id="message"
                  value={newCampaign.message_template}
                  onChange={(e) => setNewCampaign({ ...newCampaign, message_template: e.target.value })}
                  placeholder="Digite a mensagem que será enviada..."
                  rows={4}
                />
              </div>
              <div>
                <Label>Chips para Envio</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Selecione um ou mais chips para enviar as mensagens da campanha
                </p>
                <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
                  {chips.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum chip disponível
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {chips.map((chip) => (
                        <div key={chip.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`chip-${chip.id}`}
                            checked={newCampaign.selectedChips.includes(chip.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setNewCampaign({
                                  ...newCampaign,
                                  selectedChips: [...newCampaign.selectedChips, chip.id]
                                });
                              } else {
                                setNewCampaign({
                                  ...newCampaign,
                                  selectedChips: newCampaign.selectedChips.filter(id => id !== chip.id)
                                });
                              }
                            }}
                          />
                          <div className="flex items-center gap-2 flex-1">
                            <Smartphone className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <label htmlFor={`chip-${chip.id}`} className="text-sm font-medium cursor-pointer">
                                {chip.name}
                              </label>
                              <p className="text-xs text-muted-foreground">{chip.phone_number}</p>
                            </div>
                            <Badge 
                              variant={chip.status === 'active' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {chip.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {newCampaign.selectedChips.length > 0 && (
                  <p className="text-xs text-green-600 mt-2">
                    {newCampaign.selectedChips.length} chip(s) selecionado(s)
                  </p>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => {
                  setDialogOpen(false);
                  setNewCampaign({ name: '', message_template: '', selectedChips: [] });
                }}>
                  Cancelar
                </Button>
                <Button onClick={createCampaign}>
                  Criar Campanha
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Campaign Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar Campanha</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Nome da Campanha</Label>
                <Input
                  id="edit-name"
                  value={editCampaign.name}
                  onChange={(e) => setEditCampaign({ ...editCampaign, name: e.target.value })}
                  placeholder="Ex: Promoção Black Friday"
                />
              </div>
              <div>
                <Label htmlFor="edit-message">Mensagem</Label>
                <Textarea
                  id="edit-message"
                  value={editCampaign.message_template}
                  onChange={(e) => setEditCampaign({ ...editCampaign, message_template: e.target.value })}
                  placeholder="Digite a mensagem que será enviada..."
                  rows={4}
                />
              </div>
              <div>
                <Label>Chips para Envio</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Selecione um ou mais chips para enviar as mensagens da campanha
                </p>
                <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
                  {chips.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum chip disponível
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {chips.map((chip) => (
                        <div key={chip.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-chip-${chip.id}`}
                            checked={editCampaign.selectedChips.includes(chip.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setEditCampaign({
                                  ...editCampaign,
                                  selectedChips: [...editCampaign.selectedChips, chip.id]
                                });
                              } else {
                                setEditCampaign({
                                  ...editCampaign,
                                  selectedChips: editCampaign.selectedChips.filter(id => id !== chip.id)
                                });
                              }
                            }}
                          />
                          <div className="flex items-center gap-2 flex-1">
                            <Smartphone className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <label htmlFor={`edit-chip-${chip.id}`} className="text-sm font-medium cursor-pointer">
                                {chip.name}
                              </label>
                              <p className="text-xs text-muted-foreground">{chip.phone_number}</p>
                            </div>
                            <Badge 
                              variant={chip.status === 'active' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {chip.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {editCampaign.selectedChips.length > 0 && (
                  <p className="text-xs text-green-600 mt-2">
                    {editCampaign.selectedChips.length} chip(s) selecionado(s)
                  </p>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => {
                  setEditDialogOpen(false);
                  setEditCampaign({ name: '', message_template: '', selectedChips: [] });
                }}>
                  Cancelar
                </Button>
                <Button onClick={updateCampaign}>
                  Salvar Alterações
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Import Contacts Dialog */}
        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Importar Lista de Contatos</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Import Method Selection */}
              <div className="flex gap-2 border rounded-lg p-1">
                <Button
                  variant={importMethod === 'text' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    console.log('Switching to text method');
                    setImportMethod('text');
                  }}
                  className="flex-1"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Texto
                </Button>
                <Button
                  variant={importMethod === 'file' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    console.log('Switching to Excel method');
                    setImportMethod('file');
                  }}
                  className="flex-1"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Excel/XLS
                </Button>
              </div>

              {importMethod === 'text' ? (
                <div>
                  <Label htmlFor="import-data">Dados dos Contatos</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Cole os dados no formato: Nome, Telefone, Mensagem Personalizada (opcional)
                  </p>
                  <p className="text-xs text-muted-foreground mb-2">
                    Exemplo:<br/>
                    João Silva, 11999887766, Olá João!<br/>
                    Maria Santos, 11888776655
                  </p>
                  <Textarea
                    id="import-data"
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    placeholder="João Silva, 11999887766, Olá João!&#10;Maria Santos, 11888776655"
                    rows={10}
                  />
                </div>
              ) : (
                <div>
                  <Label htmlFor="excel-file">Arquivo Excel (.xlsx, .xls)</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Selecione um arquivo Excel com as colunas: Nome, Telefone, Mensagem (opcional)
                  </p>
                  <input
                    id="excel-file"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="w-full p-2 border rounded-md"
                  />
                  {importFile && (
                    <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg mt-2">
                      <FileSpreadsheet className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-700">{importFile.name}</span>
                    </div>
                  )}
                  {importData && (
                    <div className="mt-3">
                      <Label>Dados processados do arquivo:</Label>
                      <Textarea
                        value={importData}
                        onChange={(e) => setImportData(e.target.value)}
                        rows={6}
                        className="mt-1"
                      />
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm">
                  <p className="font-medium">Formato aceito:</p>
                  <p className="text-muted-foreground">Nome, Telefone, Mensagem (opcional)</p>
                </div>
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => {
                  setImportDialogOpen(false);
                  setImportData('');
                  setImportFile(null);
                  setImportMethod('text');
                }}>
                  Cancelar
                </Button>
                <Button onClick={importContacts} disabled={!importData.trim()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar Contatos
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Send className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma campanha criada</h3>
            <p className="text-muted-foreground text-center mb-4">
              Crie sua primeira campanha de marketing
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Campanha
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Send className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(campaign.status)}>
                      {getStatusLabel(campaign.status)}
                    </Badge>
                    {campaign.status === 'active' && (
                      <Button variant="outline" size="sm">
                        <Pause className="h-4 w-4" />
                      </Button>
                    )}
                    {campaign.status === 'paused' && (
                      <Button variant="outline" size="sm">
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditCampaign(campaign)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleImportContacts(campaign)}>
                          <Upload className="h-4 w-4 mr-2" />
                          Importar Lista
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza de que deseja excluir esta campanha? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deleteCampaign(campaign.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Message Preview */}
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm">{campaign.message_template}</p>
                  </div>

                  {/* Chips associados */}
                  {campaign.chips && campaign.chips.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium">Chips Selecionados:</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {campaign.chips.map((chip) => (
                          <div key={chip.id} className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-md">
                            <Smartphone className="h-3 w-3 text-primary" />
                            <span className="text-xs font-medium">{chip.name}</span>
                            <Badge 
                              variant={chip.status === 'active' ? 'default' : 'secondary'}
                              className="text-xs px-1 py-0"
                            >
                              {chip.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Progress */}
                  {campaign.total_contacts > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Progresso</span>
                        <span className="text-sm text-muted-foreground">
                          {campaign.sent_count} / {campaign.total_contacts} enviadas
                        </span>
                      </div>
                      <Progress 
                        value={(campaign.sent_count / campaign.total_contacts) * 100} 
                        className="h-2"
                      />
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 pt-3 border-t">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium">{campaign.total_contacts}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">Contatos</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Send className="h-4 w-4 text-blue-500" />
                        <p className="text-sm font-medium">{campaign.sent_count}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">Enviadas</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <MessageSquare className="h-4 w-4 text-green-500" />
                        <p className="text-sm font-medium">{campaign.success_count}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">Sucesso</p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground">
                      Criada em {new Date(campaign.created_at).toLocaleDateString('pt-BR')}
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