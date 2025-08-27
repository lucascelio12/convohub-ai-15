import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Webhook, Plus, TestTube, Trash2, ExternalLink, Zap, MessageSquare, Globe } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface WebhookConfig {
  id?: string;
  name: string;
  type: 'n8n' | 'typebot' | 'zapier' | 'generic';
  url: string;
  method: 'POST' | 'GET' | 'PUT';
  headers?: string;
  payload_template?: string;
  active: boolean;
  company_id?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

const WEBHOOK_TYPES = [
  { value: 'n8n', label: 'N8N', icon: Zap, description: 'Integração com N8N Workflow' },
  { value: 'typebot', label: 'Typebot', icon: MessageSquare, description: 'Integração com Typebot' },
  { value: 'zapier', label: 'Zapier', icon: Zap, description: 'Integração com Zapier' },
  { value: 'generic', label: 'Webhook Genérico', icon: Globe, description: 'Webhook personalizado' },
];

const DEFAULT_TEMPLATES = {
  n8n: `{
  "message": "{{message}}",
  "from": "{{from}}",
  "timestamp": "{{timestamp}}",
  "chipId": "{{chipId}}"
}`,
  typebot: `{
  "message": "{{message}}",
  "sessionId": "{{from}}",
  "variables": {
    "phoneNumber": "{{from}}",
    "chipId": "{{chipId}}"
  }
}`,
  zapier: `{
  "message": "{{message}}",
  "phone": "{{from}}",
  "timestamp": "{{timestamp}}",
  "source": "whatsapp"
}`,
  generic: `{
  "data": {
    "message": "{{message}}",
    "from": "{{from}}",
    "timestamp": "{{timestamp}}"
  }
}`
};

export const WebhookIntegrations: React.FC = () => {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookConfig | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState<WebhookConfig>({
    name: '',
    type: 'generic',
    url: '',
    method: 'POST',
    headers: '{"Content-Type": "application/json"}',
    payload_template: DEFAULT_TEMPLATES.generic,
    active: true,
  });

  useEffect(() => {
    loadWebhooks();
  }, []);

  const loadWebhooks = async () => {
    try {
      setIsLoading(true);
      // Simulando dados até os tipos serem atualizados
      setWebhooks([]);
      
      // TODO: Descomentar após tipos serem atualizados
      // const { data, error } = await supabase
      //   .from('webhook_configs')
      //   .select('*')
      //   .order('created_at', { ascending: false });

      // if (error) throw error;
      // setWebhooks(data || []);
    } catch (error) {
      console.error('Erro ao carregar webhooks:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar configurações de webhook',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTypeChange = (type: string) => {
    const newType = type as WebhookConfig['type'];
    setFormData({
      ...formData,
      type: newType,
      payload_template: DEFAULT_TEMPLATES[newType],
    });
  };

  const handleSave = async () => {
    try {
      if (!formData.name.trim() || !formData.url.trim()) {
        toast({
          title: 'Erro',
          description: 'Nome e URL são obrigatórios',
          variant: 'destructive',
        });
        return;
      }

      setIsLoading(true);

      // TODO: Implementar após tipos serem atualizados
      toast({
        title: 'Em Desenvolvimento',
        description: 'Funcionalidade será habilitada em breve',
      });

      // if (editingWebhook) {
      //   const { error } = await supabase
      //     .from('webhook_configs')
      //     .update(formData)
      //     .eq('id', editingWebhook.id);

      //   if (error) throw error;
      //   toast({
      //     title: 'Sucesso',
      //     description: 'Webhook atualizado com sucesso',
      //   });
      // } else {
      //   const { error } = await supabase
      //     .from('webhook_configs')
      //     .insert([{
      //       ...formData,
      //       company_id: '...',
      //       created_by: '...'
      //     }]);

      //   if (error) throw error;
      //   toast({
      //     title: 'Sucesso',
      //     description: 'Webhook criado com sucesso',
      //   });
      // }

      loadWebhooks();
      handleCloseDialog();
    } catch (error) {
      console.error('Erro ao salvar webhook:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao salvar webhook',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (webhook: WebhookConfig) => {
    setEditingWebhook(webhook);
    setFormData(webhook);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingWebhook(null);
    setFormData({
      name: '',
      type: 'generic',
      url: '',
      method: 'POST',
      headers: '{"Content-Type": "application/json"}',
      payload_template: DEFAULT_TEMPLATES.generic,
      active: true,
    });
  };

  const handleDelete = async (id: string) => {
    try {
      setIsLoading(true);
      
      // TODO: Implementar após tipos serem atualizados
      toast({
        title: 'Em Desenvolvimento',
        description: 'Funcionalidade será habilitada em breve',
      });

      // const { error } = await supabase
      //   .from('webhook_configs')
      //   .delete()
      //   .eq('id', id);

      // if (error) throw error;
      // toast({
      //   title: 'Sucesso',
      //   description: 'Webhook removido com sucesso',
      // });
      // loadWebhooks();
    } catch (error) {
      console.error('Erro ao deletar webhook:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao remover webhook',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testWebhook = async (webhook: WebhookConfig) => {
    try {
      setIsLoading(true);
      
      const testPayload = {
        message: 'Teste de conexão do webhook',
        from: '+5511999999999',
        timestamp: new Date().toISOString(),
        chipId: 'test-chip-id',
      };

      let processedPayload = webhook.payload_template || '{}';
      Object.entries(testPayload).forEach(([key, value]) => {
        processedPayload = processedPayload.replace(`{{${key}}}`, value);
      });

      const headers = webhook.headers ? JSON.parse(webhook.headers) : {};

      const response = await fetch(webhook.url, {
        method: webhook.method,
        headers,
        body: webhook.method !== 'GET' ? processedPayload : undefined,
      });

      if (response.ok) {
        toast({
          title: 'Teste Bem-sucedido',
          description: `Webhook respondeu com status ${response.status}`,
        });
      } else {
        toast({
          title: 'Teste Falhou',
          description: `Webhook retornou status ${response.status}`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Erro ao testar webhook:', error);
      toast({
        title: 'Erro no Teste',
        description: 'Falha ao conectar com o webhook',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleWebhookActive = async (webhook: WebhookConfig) => {
    try {
      // TODO: Implementar após tipos serem atualizados
      toast({
        title: 'Em Desenvolvimento',
        description: 'Funcionalidade será habilitada em breve',
      });

      // const { error } = await supabase
      //   .from('webhook_configs')
      //   .update({ active: !webhook.active })
      //   .eq('id', webhook.id);

      // if (error) throw error;
      // loadWebhooks();
      
      // toast({
      //   title: 'Status Atualizado',
      //   description: `Webhook ${webhook.active ? 'desativado' : 'ativado'} com sucesso`,
      // });
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao alterar status do webhook',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Integrações Webhook</h2>
          <p className="text-muted-foreground">
            Configure integrações com N8N, Typebot, Zapier e outros webhooks
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Webhook
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingWebhook ? 'Editar Webhook' : 'Novo Webhook'}
              </DialogTitle>
              <DialogDescription>
                Configure um webhook para receber eventos do sistema
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome do webhook"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo</Label>
                  <Select value={formData.type} onValueChange={handleTypeChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEBHOOK_TYPES.map((type) => {
                        const Icon = type.icon;
                        return (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="url">URL do Webhook</Label>
                <Input
                  id="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://exemplo.com/webhook"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="method">Método HTTP</Label>
                <Select value={formData.method} onValueChange={(value) => setFormData({ ...formData, method: value as WebhookConfig['method'] })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="headers">Headers (JSON)</Label>
                <Textarea
                  id="headers"
                  value={formData.headers}
                  onChange={(e) => setFormData({ ...formData, headers: e.target.value })}
                  placeholder='{"Authorization": "Bearer token"}'
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payload">Template do Payload</Label>
                <Textarea
                  id="payload"
                  value={formData.payload_template}
                  onChange={(e) => setFormData({ ...formData, payload_template: e.target.value })}
                  placeholder="Template JSON com variáveis {{message}}, {{from}}, etc."
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">
                  Variáveis disponíveis: {`{{message}}, {{from}}, {{timestamp}}, {{chipId}}`}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={isLoading}>
                  {isLoading ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && webhooks.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Carregando webhooks...</p>
        </div>
      ) : webhooks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Webhook className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum webhook configurado</h3>
            <p className="text-muted-foreground text-center mb-4">
              Configure webhooks para integrar com N8N, Typebot e outras ferramentas
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Webhook
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {webhooks.map((webhook) => {
            const webhookType = WEBHOOK_TYPES.find(t => t.value === webhook.type);
            const Icon = webhookType?.icon || Globe;
            
            return (
              <Card key={webhook.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5" />
                      <CardTitle className="text-lg">{webhook.name}</CardTitle>
                    </div>
                    <Badge variant={webhook.active ? 'default' : 'secondary'}>
                      {webhook.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <CardDescription>
                    {webhookType?.description || 'Webhook personalizado'}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">{webhook.method}</Badge>
                      <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                        {webhook.url}
                      </code>
                    </div>
                  </div>

                  <Separator />
                  
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => testWebhook(webhook)}
                        disabled={isLoading || !webhook.active}
                      >
                        <TestTube className="h-4 w-4 mr-1" />
                        Testar
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(webhook)}
                      >
                        Editar
                      </Button>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={webhook.active ? "secondary" : "default"}
                        onClick={() => toggleWebhookActive(webhook)}
                      >
                        {webhook.active ? 'Desativar' : 'Ativar'}
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover webhook</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja remover o webhook "{webhook.name}"? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(webhook.id!)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};