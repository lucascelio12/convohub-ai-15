import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Filter, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Conversation {
  id: string;
  phone_number: string;
  contact_name?: string;
  status: 'new' | 'in_progress' | 'completed';
  tags: string[];
  last_message_at: string;
  created_at: string;
  assigned_to?: string;
}

export default function Conversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('new');
  const { toast } = useToast();

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      setConversations((data as Conversation[]) || []);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar conversas: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.phone_number.includes(searchTerm) || 
                         conv.contact_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = activeTab === 'all' || conv.status === activeTab;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new': return 'Novo';
      case 'in_progress': return 'Em Andamento';
      case 'completed': return 'Finalizado';
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
          <h1 className="text-3xl font-bold">Conversas</h1>
          <p className="text-muted-foreground">Gerencie todas as conversas do WhatsApp</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nova Conversa
        </Button>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número ou nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filtros
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="new">Novas</TabsTrigger>
          <TabsTrigger value="in_progress">Em Andamento</TabsTrigger>
          <TabsTrigger value="completed">Finalizadas</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredConversations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma conversa encontrada</h3>
                <p className="text-muted-foreground text-center">
                  {searchTerm 
                    ? 'Tente ajustar os filtros de busca.'
                    : 'Comece criando uma nova conversa ou aguarde mensagens chegarem.'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredConversations.map((conversation) => (
                <Card key={conversation.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {conversation.contact_name || conversation.phone_number}
                      </CardTitle>
                      <Badge className={getStatusColor(conversation.status)}>
                        {getStatusLabel(conversation.status)}
                      </Badge>
                    </div>
                    {conversation.contact_name && (
                      <p className="text-sm text-muted-foreground">{conversation.phone_number}</p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        {conversation.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(conversation.last_message_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}