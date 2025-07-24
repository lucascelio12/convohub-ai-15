import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Users, Settings, MoreVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Queue {
  id: string;
  name: string;
  description?: string;
  color: string;
  created_at: string;
  created_by?: string;
}

export default function Queues() {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newQueue, setNewQueue] = useState({
    name: '',
    description: '',
    color: '#3B82F6'
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchQueues();
  }, []);

  const fetchQueues = async () => {
    try {
      const { data, error } = await supabase
        .from('queues')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQueues((data as Queue[]) || []);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar filas: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createQueue = async () => {
    if (!newQueue.name.trim()) return;

    try {
      const { error } = await supabase
        .from('queues')
        .insert({
          name: newQueue.name,
          description: newQueue.description,
          color: newQueue.color
        });

      if (error) throw error;
      
      setDialogOpen(false);
      setNewQueue({ name: '', description: '', color: '#3B82F6' });
      fetchQueues();
      
      toast({
        title: 'Sucesso',
        description: 'Fila criada com sucesso!',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao criar fila: ' + error.message,
        variant: 'destructive',
      });
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
          <h1 className="text-3xl font-bold">Filas de Atendimento</h1>
          <p className="text-muted-foreground">Gerencie as filas do seu sistema</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Fila
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Fila</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nome da Fila</Label>
                <Input
                  id="name"
                  value={newQueue.name}
                  onChange={(e) => setNewQueue({ ...newQueue, name: e.target.value })}
                  placeholder="Ex: Vendas, Suporte..."
                />
              </div>
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  value={newQueue.description}
                  onChange={(e) => setNewQueue({ ...newQueue, description: e.target.value })}
                  placeholder="Descrição da fila (opcional)"
                />
              </div>
              <div>
                <Label htmlFor="color">Cor</Label>
                <div className="flex gap-2">
                  <Input
                    id="color"
                    type="color"
                    value={newQueue.color}
                    onChange={(e) => setNewQueue({ ...newQueue, color: e.target.value })}
                    className="w-16 h-10"
                  />
                  <Input
                    value={newQueue.color}
                    onChange={(e) => setNewQueue({ ...newQueue, color: e.target.value })}
                    placeholder="#3B82F6"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={createQueue}>
                  Criar Fila
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {queues.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma fila criada</h3>
            <p className="text-muted-foreground text-center mb-4">
              Crie sua primeira fila para organizar o atendimento
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Fila
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {queues.map((queue) => (
            <Card key={queue.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: queue.color }}
                    />
                    <CardTitle className="text-lg">{queue.name}</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
                {queue.description && (
                  <p className="text-sm text-muted-foreground">{queue.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">0 conversas</span>
                  </div>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Configurar
                  </Button>
                </div>
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground">
                    Criada em {new Date(queue.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}