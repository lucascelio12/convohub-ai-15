import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Building2, Users, Cpu, Settings, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Company {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  logo_url?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country: string;
  subscription_plan: string;
  max_users: number;
  max_chips: number;
  max_queues: number;
  active: boolean;
  created_at: string;
  user_count?: number;
  chip_count?: number;
  queue_count?: number;
}

export default function Companies() {
  const { user, profile } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    domain: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    country: 'Brasil',
    subscription_plan: 'basic',
    max_users: 10,
    max_chips: 5,
    max_queues: 10
  });

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      fetchCompanies();
    }
  }, [isAdmin]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      
      // Buscar empresas
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (companiesError) throw companiesError;

      // Buscar contadores para cada empresa
      const companiesWithStats = await Promise.all(
        (companiesData || []).map(async (company) => {
          const [usersResult, chipsResult, queuesResult] = await Promise.all([
            supabase.from('profiles').select('id', { count: 'exact' }).eq('company_id', company.id),
            supabase.from('chips').select('id', { count: 'exact' }).eq('company_id', company.id),
            supabase.from('queues').select('id', { count: 'exact' }).eq('company_id', company.id)
          ]);

          return {
            ...company,
            user_count: usersResult.count || 0,
            chip_count: chipsResult.count || 0,
            queue_count: queuesResult.count || 0
          };
        })
      );

      setCompanies(companiesWithStats);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast.error('Erro ao carregar empresas');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = async () => {
    try {
      const slug = formData.name.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      const { error } = await supabase.from('companies').insert([{
        ...formData,
        slug,
        created_by: user?.id
      }]);

      if (error) throw error;

      toast.success('Empresa criada com sucesso!');
      setDialogOpen(false);
      resetForm();
      fetchCompanies();
    } catch (error: any) {
      console.error('Error creating company:', error);
      toast.error(error.message || 'Erro ao criar empresa');
    }
  };

  const handleEditCompany = async () => {
    if (!editingCompany) return;

    try {
      const { error } = await supabase
        .from('companies')
        .update(formData)
        .eq('id', editingCompany.id);

      if (error) throw error;

      toast.success('Empresa atualizada com sucesso!');
      setDialogOpen(false);
      resetForm();
      fetchCompanies();
    } catch (error: any) {
      console.error('Error updating company:', error);
      toast.error(error.message || 'Erro ao atualizar empresa');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      domain: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      country: 'Brasil',
      subscription_plan: 'basic',
      max_users: 10,
      max_chips: 5,
      max_queues: 10
    });
    setEditingCompany(null);
  };

  const openEditDialog = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      slug: company.slug,
      domain: company.domain || '',
      phone: company.phone || '',
      email: company.email || '',
      address: company.address || '',
      city: company.city || '',
      state: company.state || '',
      country: company.country,
      subscription_plan: company.subscription_plan,
      max_users: company.max_users,
      max_chips: company.max_chips,
      max_queues: company.max_queues
    });
    setDialogOpen(true);
  };

  const toggleCompanyStatus = async (companyId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('companies')
        .update({ active: !currentStatus })
        .eq('id', companyId);

      if (error) throw error;

      toast.success(`Empresa ${!currentStatus ? 'ativada' : 'desativada'} com sucesso!`);
      fetchCompanies();
    } catch (error: any) {
      console.error('Error toggling company status:', error);
      toast.error('Erro ao alterar status da empresa');
    }
  };

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Acesso Negado</h3>
              <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando empresas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciar Empresas</h1>
          <p className="text-muted-foreground">
            Gerencie as empresas cadastradas no sistema e seus limites de uso.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Empresa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCompany ? 'Editar Empresa' : 'Criar Nova Empresa'}</DialogTitle>
              <DialogDescription>
                Configure as informações da empresa e seus limites de uso.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome da Empresa</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome da empresa"
                  />
                </div>
                <div>
                  <Label htmlFor="domain">Domínio</Label>
                  <Input
                    id="domain"
                    value={formData.domain}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    placeholder="exemplo.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contato@empresa.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">Endereço Completo</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Rua, número, bairro"
                  className="resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="São Paulo"
                  />
                </div>
                <div>
                  <Label htmlFor="state">Estado</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="SP"
                  />
                </div>
                <div>
                  <Label htmlFor="country">País</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="Brasil"
                  />
                </div>
              </div>

              <div>
                <Label>Plano de Assinatura</Label>
                <Select 
                  value={formData.subscription_plan} 
                  onValueChange={(value) => setFormData({ ...formData, subscription_plan: value })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Básico</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="enterprise">Empresarial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="max_users">Máx. Usuários</Label>
                  <Input
                    id="max_users"
                    type="number"
                    value={formData.max_users}
                    onChange={(e) => setFormData({ ...formData, max_users: parseInt(e.target.value) || 0 })}
                    min="1"
                  />
                </div>
                <div>
                  <Label htmlFor="max_chips">Máx. Chips</Label>
                  <Input
                    id="max_chips"
                    type="number"
                    value={formData.max_chips}
                    onChange={(e) => setFormData({ ...formData, max_chips: parseInt(e.target.value) || 0 })}
                    min="1"
                  />
                </div>
                <div>
                  <Label htmlFor="max_queues">Máx. Filas</Label>
                  <Input
                    id="max_queues"
                    type="number"
                    value={formData.max_queues}
                    onChange={(e) => setFormData({ ...formData, max_queues: parseInt(e.target.value) || 0 })}
                    min="1"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={editingCompany ? handleEditCompany : handleCreateCompany} className="flex-1">
                  {editingCompany ? 'Salvar Alterações' : 'Criar Empresa'}
                </Button>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {companies.map((company) => (
          <Card key={company.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{company.name}</CardTitle>
                    <CardDescription>
                      {company.domain && <span className="inline-flex items-center gap-1"><Globe className="h-3 w-3" /> {company.domain}</span>}
                      {company.email && <span className="ml-4">{company.email}</span>}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={company.subscription_plan === 'enterprise' ? 'destructive' : company.subscription_plan === 'premium' ? 'default' : 'secondary'}>
                    {company.subscription_plan}
                  </Badge>
                  <Badge variant={company.active ? 'default' : 'secondary'}>
                    {company.active ? 'Ativa' : 'Inativa'}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(company)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => toggleCompanyStatus(company.id, company.active)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                <div>
                  <span className="font-medium flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Usuários:
                  </span>
                  <span className="text-muted-foreground">
                    {company.user_count}/{company.max_users}
                  </span>
                </div>
                <div>
                  <span className="font-medium flex items-center gap-1">
                    <Cpu className="h-3 w-3" />
                    Chips:
                  </span>
                  <span className="text-muted-foreground">
                    {company.chip_count}/{company.max_chips}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Filas:</span>
                  <span className="ml-2 text-muted-foreground">
                    {company.queue_count}/{company.max_queues}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Cidade:</span>
                  <span className="ml-2 text-muted-foreground">
                    {company.city ? `${company.city}, ${company.state}` : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Telefone:</span>
                  <span className="ml-2 text-muted-foreground">{company.phone || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-medium">Criada em:</span>
                  <span className="ml-2 text-muted-foreground">
                    {new Date(company.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
              {company.address && (
                <div className="mt-4 text-xs text-muted-foreground">
                  <strong>Endereço:</strong> {company.address}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {companies.length === 0 && (
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <div className="text-center">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma empresa encontrada</h3>
                <p className="text-muted-foreground mb-4">
                  Comece criando a primeira empresa do sistema.
                </p>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeira Empresa
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}