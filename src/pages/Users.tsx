import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Edit, Trash2, Shield, Users as UsersIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface User {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

interface Queue {
  id: string;
  name: string;
}

interface Chip {
  id: string;
  name: string;
  phone_number: string;
}

interface UserPermission {
  id: string;
  user_id: string;
  resource_type: string;
  resource_id: string;
  permission_type: string;
}

export default function Users() {
  const { user: currentUser, profile } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [chips, setChips] = useState<Chip[]>([]);
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'user',
    password: '',
    selectedQueues: [] as string[],
    selectedChips: [] as string[],
    conversationAccess: 'own' as 'own' | 'all'
  });

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Fetch queues
      const { data: queuesData, error: queuesError } = await supabase
        .from('queues')
        .select('id, name')
        .eq('active', true);

      if (queuesError) throw queuesError;

      // Fetch chips
      const { data: chipsData, error: chipsError } = await supabase
        .from('chips')
        .select('id, name, phone_number')
        .eq('status', 'active');

      if (chipsError) throw chipsError;

      // Fetch permissions
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('user_permissions')
        .select('*');

      if (permissionsError) throw permissionsError;

      setUsers(usersData || []);
      setQueues(queuesData || []);
      setChips(chipsData || []);
      setPermissions(permissionsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      // Create user via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            role: formData.role
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Create permissions for queues
        if (formData.selectedQueues.length > 0) {
          const queuePermissions = formData.selectedQueues.map(queueId => ({
            user_id: authData.user!.id,
            resource_type: 'queue',
            resource_id: queueId,
            permission_type: 'read'
          }));

          // Add as queue manager
          const queueManagers = formData.selectedQueues.map(queueId => ({
            queue_id: queueId,
            user_id: authData.user!.id
          }));

          await supabase.from('user_permissions').insert(queuePermissions);
          await supabase.from('queue_managers').insert(queueManagers);
        }

        // Create permissions for chips
        if (formData.selectedChips.length > 0) {
          const chipPermissions = formData.selectedChips.map(chipId => ({
            user_id: authData.user!.id,
            resource_type: 'chip',
            resource_id: chipId,
            permission_type: 'read'
          }));

          await supabase.from('user_permissions').insert(chipPermissions);
        }

        toast.success('Usuário criado com sucesso!');
        setDialogOpen(false);
        resetForm();
        fetchData();
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Erro ao criar usuário');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;

    try {
      // Delete from auth.users will cascade to profiles and permissions
      const { error } = await supabase.auth.admin.deleteUser(userId);
      
      if (error) throw error;

      toast.success('Usuário excluído com sucesso!');
      fetchData();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error('Erro ao excluir usuário');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      role: 'user',
      password: '',
      selectedQueues: [],
      selectedChips: [],
      conversationAccess: 'own'
    });
    setEditingUser(null);
  };

  const getUserPermissions = (userId: string) => {
    return permissions.filter(p => p.user_id === userId);
  };

  const getPermissionSummary = (userId: string) => {
    const userPerms = getUserPermissions(userId);
    const queueCount = userPerms.filter(p => p.resource_type === 'queue').length;
    const chipCount = userPerms.filter(p => p.resource_type === 'chip').length;
    const conversationCount = userPerms.filter(p => p.resource_type === 'conversation').length;

    return {
      queues: queueCount,
      chips: chipCount,
      conversations: conversationCount
    };
  };

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
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
          <p className="text-muted-foreground">Carregando usuários...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciar Usuários</h1>
          <p className="text-muted-foreground">
            Crie e gerencie usuários com permissões específicas para filas, chips e conversas.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
              <DialogDescription>
                Configure as informações do usuário e suas permissões de acesso.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome completo"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Senha temporária"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Função</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Usuário</SelectItem>
                      <SelectItem value="agent">Agente</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Filas Permitidas</Label>
                <div className="grid grid-cols-2 gap-2 mt-2 max-h-32 overflow-y-auto border rounded-md p-3">
                  {queues.map((queue) => (
                    <label key={queue.id} className="flex items-center space-x-2 cursor-pointer">
                      <Checkbox
                        checked={formData.selectedQueues.includes(queue.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({
                              ...formData,
                              selectedQueues: [...formData.selectedQueues, queue.id]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              selectedQueues: formData.selectedQueues.filter(id => id !== queue.id)
                            });
                          }
                        }}
                      />
                      <span className="text-sm">{queue.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Label>Chips Permitidos</Label>
                <div className="grid grid-cols-1 gap-2 mt-2 max-h-32 overflow-y-auto border rounded-md p-3">
                  {chips.map((chip) => (
                    <label key={chip.id} className="flex items-center space-x-2 cursor-pointer">
                      <Checkbox
                        checked={formData.selectedChips.includes(chip.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({
                              ...formData,
                              selectedChips: [...formData.selectedChips, chip.id]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              selectedChips: formData.selectedChips.filter(id => id !== chip.id)
                            });
                          }
                        }}
                      />
                      <span className="text-sm">{chip.name} ({chip.phone_number})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Label>Acesso a Conversas</Label>
                <Select 
                  value={formData.conversationAccess} 
                  onValueChange={(value: 'own' | 'all') => setFormData({ ...formData, conversationAccess: value })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="own">Apenas próprias conversas</SelectItem>
                    <SelectItem value="all">Todas as conversas das filas permitidas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleCreateUser} className="flex-1">
                  Criar Usuário
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
        {users.map((user) => {
          const permSummary = getPermissionSummary(user.user_id);
          
          return (
            <Card key={user.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <UsersIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{user.name}</CardTitle>
                      <CardDescription>{user.email}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'}>
                      {user.role}
                    </Badge>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDeleteUser(user.user_id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Filas:</span>
                    <span className="ml-2 text-muted-foreground">{permSummary.queues} permitidas</span>
                  </div>
                  <div>
                    <span className="font-medium">Chips:</span>
                    <span className="ml-2 text-muted-foreground">{permSummary.chips} permitidos</span>
                  </div>
                  <div>
                    <span className="font-medium">Conversas:</span>
                    <span className="ml-2 text-muted-foreground">
                      {permSummary.conversations > 0 ? `${permSummary.conversations} específicas` : 'Por fila'}
                    </span>
                  </div>
                </div>
                <div className="mt-4 text-xs text-muted-foreground">
                  Criado em: {new Date(user.created_at).toLocaleDateString('pt-BR')}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {users.length === 0 && (
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <div className="text-center">
                <UsersIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum usuário encontrado</h3>
                <p className="text-muted-foreground mb-4">
                  Comece criando o primeiro usuário do sistema.
                </p>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Usuário
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}