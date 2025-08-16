import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useRealTimeReports } from '@/hooks/useRealTimeReports';
import { useBackupRestore } from '@/hooks/useBackupRestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Activity, Users, Clock, MessageSquare, Download, Upload, Database, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';

export default function AdvancedReports() {
  const { metrics, loading, lastUpdate, loadMetrics, exportMetrics } = useRealTimeReports();
  const { createBackup, restoreFromBackup, isBackingUp, isRestoring } = useBackupRestore();

  const handleFileRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      restoreFromBackup(file);
    }
  };

  const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Relatórios Avançados</h1>
          <p className="text-muted-foreground">
            Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadMetrics} variant="outline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button onClick={() => exportMetrics('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="backup">Backup & Restore</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Métricas Principais */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Conversas</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalConversations}</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 inline mr-1" />
                  +12% desde ontem
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversas Ativas</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.activeConversations}</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingDown className="h-3 w-3 inline mr-1" />
                  -3% desde ontem
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Finalizadas Hoje</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.completedToday}</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 inline mr-1" />
                  +8% desde ontem
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tempo Médio de Resposta</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.averageResponseTime}s</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingDown className="h-3 w-3 inline mr-1" />
                  -15% desde ontem
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos Principais */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Conversas por Hora</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="conversations" fill="hsl(var(--primary))" />
                    <Bar dataKey="completed" fill="hsl(var(--secondary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tempo de Resposta (24h)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metrics.responseTimeChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="avgResponseTime" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance de Agentes */}
            <Card>
              <CardHeader>
                <CardTitle>Performance dos Agentes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {metrics.agentPerformance.map((agent) => (
                  <div key={agent.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{agent.name}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant={agent.status === 'online' ? 'default' : 'secondary'}>
                            {agent.status}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {agent.activeConversations} ativas
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{agent.completedToday}</p>
                      <p className="text-sm text-muted-foreground">finalizadas</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Métricas de Filas */}
            <Card>
              <CardHeader>
                <CardTitle>Status das Filas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {metrics.queueMetrics.map((queue) => (
                  <div key={queue.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{queue.name}</span>
                      <Badge variant="outline">{queue.waitingCount} aguardando</Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Tempo médio de espera</span>
                        <span>{Math.floor(queue.averageWaitTime / 60)}min</span>
                      </div>
                      <Progress value={(queue.completedToday / 10) * 100} className="h-2" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Tendências de Conversas</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={metrics.hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="conversations" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      name="Novas Conversas"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="completed" 
                      stroke="hsl(var(--secondary))" 
                      strokeWidth={2}
                      name="Finalizadas"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Novas', value: metrics.totalConversations - metrics.activeConversations - metrics.completedToday },
                        { name: 'Em Andamento', value: metrics.activeConversations },
                        { name: 'Finalizadas', value: metrics.completedToday },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {CHART_COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Backup & Restore Tab */}
        <TabsContent value="backup" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Backup de Dados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Crie um backup completo de todas as conversas, mensagens e configurações.
                </p>
                
                <div className="space-y-3">
                  <Button 
                    onClick={() => createBackup(true, 'Backup manual completo')}
                    disabled={isBackingUp}
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {isBackingUp ? 'Criando Backup...' : 'Criar Backup Completo'}
                  </Button>
                  
                  <Button 
                    onClick={() => createBackup(false, 'Backup apenas conversas')}
                    disabled={isBackingUp}
                    variant="outline"
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Backup Apenas Conversas
                  </Button>
                </div>

                {isBackingUp && (
                  <div className="space-y-2">
                    <Progress value={66} />
                    <p className="text-sm text-muted-foreground">Processando dados...</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Restaurar Dados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Restaure dados de um arquivo de backup anterior.
                </p>
                
                <div className="space-y-3">
                  <div>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileRestore}
                      disabled={isRestoring}
                      className="hidden"
                      id="backup-file"
                    />
                    <Button 
                      onClick={() => document.getElementById('backup-file')?.click()}
                      disabled={isRestoring}
                      variant="outline"
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {isRestoring ? 'Restaurando...' : 'Selecionar Arquivo de Backup'}
                    </Button>
                  </div>
                </div>

                {isRestoring && (
                  <div className="space-y-2">
                    <Progress value={33} />
                    <p className="text-sm text-muted-foreground">Restaurando dados...</p>
                  </div>
                )}

                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Atenção:</strong> A restauração irá substituir todos os dados atuais.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}