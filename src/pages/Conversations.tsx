import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Filter, MessageSquare, Send, Phone, MoreVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Conversation {
  id: string;
  phone_number: string;
  contact_name?: string;
  status: 'new' | 'in_progress' | 'completed';
  conversation_type: 'individual' | 'group';
  tags: string[];
  last_message_at: string;
  created_at: string;
  assigned_to?: string;
  queue_id?: string;
  queues?: {
    name: string;
    color: string;
  };
}

interface Message {
  id: string;
  content: string;
  sender_type: 'user' | 'agent';
  created_at: string;
  sender_id?: string;
}

export default function Conversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('new');
  const [newMessage, setNewMessage] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          queues (
            name,
            color
          )
        `)
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      
      // Adicionar conversation_type padrão se não existir
      const conversationsWithType = (data || []).map((conv: any) => ({
        ...conv,
        conversation_type: conv.conversation_type || (conv.phone_number?.includes('@g.us') ? 'group' : 'individual')
      }));
      
      setConversations(conversationsWithType as Conversation[]);
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

  const fetchMessages = async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data as Message[]) || []);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar mensagens: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation.id,
          content: newMessage,
          sender_type: 'agent',
          message_type: 'text'
        });

      if (error) throw error;
      
      setNewMessage('');
      fetchMessages(selectedConversation.id);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao enviar mensagem: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const selectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    fetchMessages(conversation.id);
  };

  const finishConversation = async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ status: 'completed' })
        .eq('id', conversationId);

      if (error) throw error;
      
      fetchConversations();
      toast({
        title: 'Sucesso',
        description: 'Conversa finalizada com sucesso!',
        variant: 'default',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao finalizar conversa: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.phone_number.includes(searchTerm) || 
                         conv.contact_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesTab = false;
    switch (activeTab) {
      case 'new':
        matchesTab = conv.status === 'new' && conv.conversation_type === 'individual';
        break;
      case 'in_progress':
        matchesTab = conv.status === 'in_progress' && conv.conversation_type === 'individual';
        break;
      case 'groups':
        matchesTab = conv.conversation_type === 'group';
        break;
      case 'completed':
        matchesTab = conv.status === 'completed';
        break;
      default:
        matchesTab = true;
    }
    
    return matchesSearch && matchesTab;
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
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div>
          <h1 className="text-2xl font-bold">Conversas</h1>
          <p className="text-sm text-muted-foreground">Atendimento WhatsApp</p>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nova Conversa
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Lista de Conversas */}
        <div className="w-80 border-r bg-background flex flex-col">
          {/* Search and Filters */}
          <div className="p-4 border-b space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar conversas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="new" className="text-xs">Novas</TabsTrigger>
                <TabsTrigger value="in_progress" className="text-xs">Em Andamento</TabsTrigger>
                <TabsTrigger value="groups" className="text-xs">Grupos</TabsTrigger>
                <TabsTrigger value="completed" className="text-xs">Finalizadas</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Conversations List */}
          <ScrollArea className="flex-1">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma conversa encontrada
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => selectConversation(conversation)}
                    className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedConversation?.id === conversation.id ? 'bg-muted' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Phone className="h-5 w-5 text-primary" />
                      </div>
                      
                      {/* Conversation Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-medium text-sm truncate">
                            {conversation.contact_name || conversation.phone_number}
                          </h3>
                          <span className="text-xs text-muted-foreground">
                            {new Date(conversation.last_message_at).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 mb-2">
                          {conversation.queues && (
                            <Badge 
                              variant="secondary" 
                              className="text-xs px-2 py-0"
                              style={{ backgroundColor: conversation.queues.color + '20', color: conversation.queues.color }}
                            >
                              {conversation.queues.name}
                            </Badge>
                          )}
                          <Badge className={`text-xs px-2 py-0 ${getStatusColor(conversation.status)}`}>
                            {getStatusLabel(conversation.status)}
                          </Badge>
                        </div>
                        
                        <p className="text-xs text-muted-foreground truncate">
                          {conversation.phone_number}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b bg-background flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-medium">
                      {selectedConversation.contact_name || selectedConversation.phone_number}
                    </h2>
                    <div className="flex items-center gap-2">
                      {selectedConversation.queues && (
                        <span className="text-sm text-muted-foreground">
                          {selectedConversation.queues.name}
                        </span>
                      )}
                      <span className="text-sm text-muted-foreground">
                        • {selectedConversation.phone_number}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {selectedConversation.status !== 'completed' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => finishConversation(selectedConversation.id)}
                    >
                      Finalizar
                    </Button>
                  )}
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Messages Area */}
              <ScrollArea className="flex-1 p-4">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    <p>Nenhuma mensagem ainda</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender_type === 'agent' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.sender_type === 'agent'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            message.sender_type === 'agent' 
                              ? 'text-primary-foreground/70' 
                              : 'text-muted-foreground'
                          }`}>
                            {new Date(message.created_at).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t bg-background">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Digite sua mensagem..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    className="min-h-[60px] max-h-32 resize-none"
                  />
                  <Button 
                    onClick={sendMessage} 
                    disabled={!newMessage.trim()}
                    className="self-end"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center">
              <div>
                <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Selecione uma conversa</h3>
                <p className="text-muted-foreground">
                  Escolha uma conversa na lista à esquerda para começar o atendimento
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}