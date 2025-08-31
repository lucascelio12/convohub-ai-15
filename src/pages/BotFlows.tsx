import React, { useState, useCallback, useEffect } from 'react';
import { ReactFlow, MiniMap, Controls, Background, useNodesState, useEdgesState, addEdge, Connection, Edge, Node, BackgroundVariant } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  Bot, 
  Plus, 
  Play, 
  Save, 
  Trash2, 
  MessageSquare, 
  Zap,
  Settings,
  GitBranch,
  Webhook,
  Bot as BotIcon,
  TestTube
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Tipos para os nós
type NodeType = 'trigger' | 'action' | 'condition' | 'webhook' | 'gpt' | 'n8n' | 'typebot';

interface FlowNode extends Node {
  type: NodeType;
  data: {
    label: string;
    config?: any;
    nodeType: NodeType;
  };
}

interface BotFlow {
  id: string;
  name: string;
  description: string;
  active: boolean;
  nodes: FlowNode[];
  edges: Edge[];
  created_at: string;
  updated_at: string;
  created_by: string;
  company_id: string;
}

const nodeTypes = {
  trigger: ({ data }: { data: any }) => (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-green-500">
      <div className="flex items-center gap-2">
        <Play className="h-4 w-4 text-green-600" />
        <div className="text-sm font-medium">{data.label}</div>
      </div>
    </div>
  ),
  action: ({ data }: { data: any }) => (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-blue-500">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-blue-600" />
        <div className="text-sm font-medium">{data.label}</div>
      </div>
    </div>
  ),
  condition: ({ data }: { data: any }) => (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-yellow-500">
      <div className="flex items-center gap-2">
        <GitBranch className="h-4 w-4 text-yellow-600" />
        <div className="text-sm font-medium">{data.label}</div>
      </div>
    </div>
  ),
  webhook: ({ data }: { data: any }) => (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-purple-500">
      <div className="flex items-center gap-2">
        <Webhook className="h-4 w-4 text-purple-600" />
        <div className="text-sm font-medium">{data.label}</div>
      </div>
    </div>
  ),
  gpt: ({ data }: { data: any }) => (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-orange-500">
      <div className="flex items-center gap-2">
        <BotIcon className="h-4 w-4 text-orange-600" />
        <div className="text-sm font-medium">{data.label}</div>
      </div>
    </div>
  ),
  n8n: ({ data }: { data: any }) => (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-red-500">
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-red-600" />
        <div className="text-sm font-medium">{data.label}</div>
      </div>
    </div>
  ),
  typebot: ({ data }: { data: any }) => (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-indigo-500">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-indigo-600" />
        <div className="text-sm font-medium">{data.label}</div>
      </div>
    </div>
  ),
};

const initialNodes: FlowNode[] = [];
const initialEdges: Edge[] = [];

const BotFlows = () => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [flows, setFlows] = useState<BotFlow[]>([]);
  const [selectedFlow, setSelectedFlow] = useState<BotFlow | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isNodeDialogOpen, setIsNodeDialogOpen] = useState(false);
  const [newFlowData, setNewFlowData] = useState({ name: '', description: '' });
  const [nodeType, setNodeType] = useState<NodeType>('trigger');
  const [nodeConfig, setNodeConfig] = useState({
    label: '',
    trigger: '',
    message: '',
    conditions: '',
    webhookUrl: '',
    gptPrompt: '',
    n8nWorkflowId: '',
    typebotId: ''
  });

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const loadFlows = async () => {
    try {
      const { data, error } = await supabase
        .from('bot_flows')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Converter os dados do banco para o formato esperado
      const formattedFlows = (data || []).map(flow => ({
        ...flow,
        nodes: Array.isArray(flow.nodes) ? (flow.nodes as unknown) as FlowNode[] : [],
        edges: Array.isArray(flow.edges) ? (flow.edges as unknown) as Edge[] : []
      }));
      
      setFlows(formattedFlows);
    } catch (error) {
      console.error('Erro ao carregar fluxos:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar fluxos",
        variant: "destructive",
      });
    }
  };

  const createFlow = async () => {
    if (!user || !profile?.company_id) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('bot_flows')
        .insert({
          name: newFlowData.name,
          description: newFlowData.description || '',
          active: false,
          nodes: [],
          edges: [],
          created_by: user.id,
          company_id: profile.company_id
        })
        .select()
        .single();

      if (error) throw error;

      const formattedFlow = {
        ...data,
        nodes: Array.isArray(data.nodes) ? (data.nodes as unknown) as FlowNode[] : [],
        edges: Array.isArray(data.edges) ? (data.edges as unknown) as Edge[] : []
      };

      setFlows(prev => [formattedFlow, ...prev]);
      setNewFlowData({ name: '', description: '' });
      setIsCreateDialogOpen(false);
      toast({
        title: "Sucesso",
        description: "Fluxo criado com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao criar fluxo:', error);
      toast({
        title: "Erro",
        description: "Falha ao criar fluxo",
        variant: "destructive",
      });
    }
  };

  const saveFlow = async () => {
    if (!selectedFlow) return;

    try {
      const { error } = await supabase
        .from('bot_flows')
        .update({
          nodes: JSON.parse(JSON.stringify(nodes)),
          edges: JSON.parse(JSON.stringify(edges)),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedFlow.id);

      if (error) throw error;

      setFlows(prev => prev.map(f => 
        f.id === selectedFlow.id 
          ? { ...f, nodes, edges, updated_at: new Date().toISOString() }
          : f
      ));

      toast({
        title: "Sucesso",
        description: "Fluxo salvo com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao salvar fluxo:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar fluxo",
        variant: "destructive",
      });
    }
  };

  const addNode = () => {
    const newNode: FlowNode = {
      id: `${nodeType}-${Date.now()}`,
      type: nodeType,
      position: { x: Math.random() * 400, y: Math.random() * 300 },
      data: {
        label: nodeConfig.label || `${nodeType} node`,
        nodeType,
        config: getNodeConfig()
      },
    };

    setNodes((nds) => [...nds, newNode]);
    setIsNodeDialogOpen(false);
    resetNodeConfig();
  };

  const getNodeConfig = () => {
    switch (nodeType) {
      case 'trigger':
        return { trigger: nodeConfig.trigger };
      case 'action':
        return { message: nodeConfig.message };
      case 'condition':
        return { conditions: nodeConfig.conditions };
      case 'webhook':
        return { webhookUrl: nodeConfig.webhookUrl };
      case 'gpt':
        return { gptPrompt: nodeConfig.gptPrompt };
      case 'n8n':
        return { n8nWorkflowId: nodeConfig.n8nWorkflowId };
      case 'typebot':
        return { typebotId: nodeConfig.typebotId };
      default:
        return {};
    }
  };

  const resetNodeConfig = () => {
    setNodeConfig({
      label: '',
      trigger: '',
      message: '',
      conditions: '',
      webhookUrl: '',
      gptPrompt: '',
      n8nWorkflowId: '',
      typebotId: ''
    });
  };

  const loadFlow = (flow: BotFlow) => {
    setSelectedFlow(flow);
    setNodes(flow.nodes || []);
    setEdges(flow.edges || []);
  };

  const deleteFlow = async (flowId: string) => {
    try {
      const { error } = await supabase
        .from('bot_flows')
        .delete()
        .eq('id', flowId);

      if (error) throw error;

      setFlows(prev => prev.filter(f => f.id !== flowId));
      if (selectedFlow?.id === flowId) {
        setSelectedFlow(null);
        setNodes([]);
        setEdges([]);
      }

      toast({
        title: "Sucesso",
        description: "Fluxo excluído com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao excluir fluxo:', error);
      toast({
        title: "Erro",
        description: "Falha ao excluir fluxo",
        variant: "destructive",
      });
    }
  };

  const toggleFlowActive = async (flowId: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from('bot_flows')
        .update({ active })
        .eq('id', flowId);

      if (error) throw error;

      setFlows(prev => prev.map(f => 
        f.id === flowId ? { ...f, active } : f
      ));

      toast({
        title: "Sucesso",
        description: `Fluxo ${active ? 'ativado' : 'desativado'} com sucesso!`,
      });
    } catch (error) {
      console.error('Erro ao alterar status do fluxo:', error);
      toast({
        title: "Erro",
        description: "Falha ao alterar status do fluxo",
        variant: "destructive",
      });
    }
  };

  const testFlow = (flow: BotFlow) => {
    if (!flow.nodes.length) {
      toast({
        title: "Atenção",
        description: "O fluxo não possui nós para testar",
        variant: "destructive",
      });
      return;
    }

    // Testar fluxo com uma mensagem de exemplo
    const testMessage = "oi";
    
    toast({
      title: "Teste iniciado",
      description: "Executando fluxo com mensagem de teste: 'oi'",
    });

    // Executar o fluxo via edge function
    executeFlowTest(flow.id, testMessage);
  };

  const executeFlowTest = async (flowId: string, message: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('execute-bot-flow', {
        body: {
          flowId,
          message,
          userId: user.id
        }
      });

      if (error) throw error;

      toast({
        title: "Teste concluído",
        description: `Fluxo executado: ${data.result?.executedNodes?.length || 0} nós processados`,
      });
      
      console.log('Resultado do teste:', data);
    } catch (error) {
      console.error('Erro no teste do fluxo:', error);
      toast({
        title: "Erro no teste",
        description: "Falha ao executar o fluxo",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadFlows();
  }, []);

  return (
    <div className="container mx-auto p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bot className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold">Fluxos de Chatbot</h1>
            <p className="text-muted-foreground">Configure fluxos automatizados com IA e integrações</p>
          </div>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Fluxo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Fluxo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nome do Fluxo</Label>
                <Input
                  id="name"
                  value={newFlowData.name}
                  onChange={(e) => setNewFlowData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Atendimento Inicial"
                />
              </div>
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={newFlowData.description}
                  onChange={(e) => setNewFlowData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva o objetivo deste fluxo"
                />
              </div>
              <Button onClick={createFlow} className="w-full">
                Criar Fluxo
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-200px)]">
        {/* Lista de Fluxos */}
        <div className="col-span-3 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Meus Fluxos</CardTitle>
              <CardDescription>
                Gerencie seus fluxos de chatbot
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {flows.map((flow) => (
                <div
                  key={flow.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedFlow?.id === flow.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
                  }`}
                  onClick={() => loadFlow(flow)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{flow.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {flow.description}
                      </p>
                    </div>
                    <Badge variant={flow.active ? 'default' : 'secondary'}>
                      {flow.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFlowActive(flow.id, !flow.active);
                      }}
                    >
                      {flow.active ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteFlow(flow.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Editor de Fluxo */}
        <div className="col-span-9">
          {selectedFlow ? (
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedFlow.name}</CardTitle>
                    <CardDescription>{selectedFlow.description}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Dialog open={isNodeDialogOpen} onOpenChange={setIsNodeDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Plus className="h-4 w-4 mr-1" />
                          Adicionar Nó
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Adicionar Novo Nó</DialogTitle>
                        </DialogHeader>
                        <Tabs value={nodeType} onValueChange={(value) => setNodeType(value as NodeType)}>
                          <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="trigger">Gatilho</TabsTrigger>
                            <TabsTrigger value="action">Ação</TabsTrigger>
                            <TabsTrigger value="condition">Condição</TabsTrigger>
                            <TabsTrigger value="webhook">Webhook</TabsTrigger>
                          </TabsList>
                          <TabsList className="grid w-full grid-cols-3 mt-2">
                            <TabsTrigger value="gpt">GPT</TabsTrigger>
                            <TabsTrigger value="n8n">N8N</TabsTrigger>
                            <TabsTrigger value="typebot">Typebot</TabsTrigger>
                          </TabsList>
                          
                          <div className="space-y-4 mt-4">
                            <div>
                              <Label htmlFor="nodeLabel">Nome do Nó</Label>
                              <Input
                                id="nodeLabel"
                                value={nodeConfig.label}
                                onChange={(e) => setNodeConfig(prev => ({ ...prev, label: e.target.value }))}
                                placeholder="Nome do nó"
                              />
                            </div>

                            {nodeType === 'trigger' && (
                              <div>
                                <Label htmlFor="trigger">Palavra-chave do Gatilho</Label>
                                <Input
                                  id="trigger"
                                  value={nodeConfig.trigger}
                                  onChange={(e) => setNodeConfig(prev => ({ ...prev, trigger: e.target.value }))}
                                  placeholder="Ex: oi, olá, help"
                                />
                              </div>
                            )}

                            {nodeType === 'action' && (
                              <div>
                                <Label htmlFor="message">Mensagem</Label>
                                <Textarea
                                  id="message"
                                  value={nodeConfig.message}
                                  onChange={(e) => setNodeConfig(prev => ({ ...prev, message: e.target.value }))}
                                  placeholder="Mensagem a ser enviada"
                                />
                              </div>
                            )}

                            {nodeType === 'condition' && (
                              <div>
                                <Label htmlFor="conditions">Condições</Label>
                                <Textarea
                                  id="conditions"
                                  value={nodeConfig.conditions}
                                  onChange={(e) => setNodeConfig(prev => ({ ...prev, conditions: e.target.value }))}
                                  placeholder="Condições para avaliação"
                                />
                              </div>
                            )}

                            {nodeType === 'webhook' && (
                              <div>
                                <Label htmlFor="webhookUrl">URL do Webhook</Label>
                                <Input
                                  id="webhookUrl"
                                  value={nodeConfig.webhookUrl}
                                  onChange={(e) => setNodeConfig(prev => ({ ...prev, webhookUrl: e.target.value }))}
                                  placeholder="https://..."
                                />
                              </div>
                            )}

                            {nodeType === 'gpt' && (
                              <div>
                                <Label htmlFor="gptPrompt">Prompt do GPT</Label>
                                <Textarea
                                  id="gptPrompt"
                                  value={nodeConfig.gptPrompt}
                                  onChange={(e) => setNodeConfig(prev => ({ ...prev, gptPrompt: e.target.value }))}
                                  placeholder="Prompt para o ChatGPT"
                                />
                              </div>
                            )}

                            {nodeType === 'n8n' && (
                              <div>
                                <Label htmlFor="n8nWorkflowId">ID do Workflow N8N</Label>
                                <Input
                                  id="n8nWorkflowId"
                                  value={nodeConfig.n8nWorkflowId}
                                  onChange={(e) => setNodeConfig(prev => ({ ...prev, n8nWorkflowId: e.target.value }))}
                                  placeholder="ID do workflow"
                                />
                              </div>
                            )}

                            {nodeType === 'typebot' && (
                              <div>
                                <Label htmlFor="typebotId">ID do Typebot</Label>
                                <Input
                                  id="typebotId"
                                  value={nodeConfig.typebotId}
                                  onChange={(e) => setNodeConfig(prev => ({ ...prev, typebotId: e.target.value }))}
                                  placeholder="ID do typebot"
                                />
                              </div>
                            )}
                          </div>
                          
                          <Button onClick={addNode} className="w-full mt-4">
                            Adicionar Nó
                          </Button>
                        </Tabs>
                      </DialogContent>
                    </Dialog>
                    
                     <Button onClick={saveFlow} size="sm">
                       <Save className="h-4 w-4 mr-1" />
                       Salvar
                     </Button>
                     
                     <Button 
                       onClick={() => testFlow(selectedFlow)} 
                       size="sm" 
                       variant="outline"
                     >
                       <TestTube className="h-4 w-4 mr-1" />
                       Testar
                     </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-[calc(100%-100px)]">
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  nodeTypes={nodeTypes}
                  fitView
                  className="bg-slate-50 rounded-lg"
                >
                  <Controls />
                  <MiniMap />
                  <Background variant={"dots" as BackgroundVariant} gap={12} size={1} />
                </ReactFlow>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent>
                <div className="text-center text-muted-foreground">
                  <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Selecione um fluxo para editar ou crie um novo</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default BotFlows;