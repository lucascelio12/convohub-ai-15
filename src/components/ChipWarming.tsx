import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Thermometer, Play, Square, Settings2 } from 'lucide-react';

interface Chip {
  id: string;
  name: string;
  phone_number: string;
  status: string;
}

interface WarmingSession {
  id: string;
  selectedChips: string[];
  isActive: boolean;
  intervalMinutes: number;
  messages: string[];
}

export function ChipWarming() {
  const [chips, setChips] = useState<Chip[]>([]);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [isWarming, setIsWarming] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState(5);
  const [messages, setMessages] = useState<string[]>([
    'Olá! Como está o dia?',
    'Tudo bem por aí?',
    'Espero que esteja tudo certo!',
    'Oi! Tudo tranquilo?',
    'Como vai?'
  ]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [configOpen, setConfigOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchChips();
  }, []);

  const fetchChips = async () => {
    try {
      console.log('🔍 ChipWarming - Buscando chips ativos...');
      const { data, error } = await supabase
        .from('chips')
        .select('id, name, phone_number, status')
        .eq('status', 'active');

      console.log('📊 ChipWarming - Resultado:', { data, error });
      if (error) throw error;
      console.log('Chips carregados:', data);
      setChips(data || []);
    } catch (error) {
      console.error('❌ ChipWarming - Erro ao buscar chips:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar chips',
        variant: 'destructive',
      });
    }
  };

  const handleChipSelection = (chipId: string, checked: boolean) => {
    if (checked) {
      setSelectedChips(prev => [...prev, chipId]);
    } else {
      setSelectedChips(prev => prev.filter(id => id !== chipId));
    }
  };

  const addMessage = () => {
    if (currentMessage.trim()) {
      setMessages(prev => [...prev, currentMessage.trim()]);
      setCurrentMessage('');
    }
  };

  const removeMessage = (index: number) => {
    setMessages(prev => prev.filter((_, i) => i !== index));
  };

  const startWarming = async () => {
    if (selectedChips.length < 2) {
      toast({
        title: 'Erro',
        description: 'Selecione pelo menos 2 chips para o aquecimento',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await supabase.functions.invoke('whatsapp-manager', {
        body: JSON.stringify({
          action: 'start-warming',
          chipIds: selectedChips,
          intervalMinutes,
          messages
        })
      });

      if (response.error) throw response.error;

      setIsWarming(true);
      toast({
        title: 'Aquecimento iniciado',
        description: `Aquecimento iniciado com ${selectedChips.length} chips`,
      });
    } catch (error) {
      console.error('Erro ao iniciar aquecimento:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao iniciar aquecimento',
        variant: 'destructive',
      });
    }
  };

  const stopWarming = async () => {
    try {
      const response = await supabase.functions.invoke('whatsapp-manager', {
        body: JSON.stringify({
          action: 'stop-warming'
        })
      });

      if (response.error) throw response.error;

      setIsWarming(false);
      toast({
        title: 'Aquecimento parado',
        description: 'O aquecimento foi interrompido',
      });
    } catch (error) {
      console.error('Erro ao parar aquecimento:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao parar aquecimento',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Thermometer className="h-5 w-5" />
              Aquecimento de Chips
            </CardTitle>
            <CardDescription>
              Selecione os chips para manter aquecidos enviando mensagens entre eles
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Dialog open={configOpen} onOpenChange={setConfigOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings2 className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Configurações do Aquecimento</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="interval">Intervalo (minutos)</Label>
                    <Input
                      id="interval"
                      type="number"
                      min="1"
                      max="60"
                      value={intervalMinutes}
                      onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Mensagens do Aquecimento</Label>
                    <div className="space-y-2">
                      {messages.map((msg, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <span className="text-sm flex-1">{msg}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeMessage(index)}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Input
                        placeholder="Nova mensagem"
                        value={currentMessage}
                        onChange={(e) => setCurrentMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addMessage()}
                      />
                      <Button onClick={addMessage}>Adicionar</Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            {isWarming ? (
              <Button onClick={stopWarming} variant="destructive" size="sm">
                <Square className="h-4 w-4 mr-2" />
                Parar
              </Button>
            ) : (
              <Button 
                onClick={startWarming} 
                disabled={selectedChips.length < 2}
                size="sm"
              >
                <Play className="h-4 w-4 mr-2" />
                Iniciar
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isWarming && (
            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
              Aquecimento ativo - {selectedChips.length} chips
            </Badge>
          )}
          
          <div>
            <h3 className="text-lg font-medium mb-3">Selecionar Chips para Aquecimento</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Escolha pelo menos 2 chips ativos para iniciar o aquecimento. Os chips selecionados irão trocar mensagens entre si para manter a conexão aquecida.
            </p>
            
            {chips.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Thermometer className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum chip ativo encontrado</p>
                <p className="text-sm">Conecte alguns chips primeiro para usar o aquecimento</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {chips.map((chip) => (
                  <div key={chip.id} className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <Checkbox
                      id={chip.id}
                      checked={selectedChips.includes(chip.id)}
                      onCheckedChange={(checked) => handleChipSelection(chip.id, checked as boolean)}
                      disabled={isWarming}
                    />
                    <label
                      htmlFor={chip.id}
                      className="flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      <div>
                        <div className="font-medium">{chip.name}</div>
                        <div className="text-muted-foreground text-xs">{chip.phone_number}</div>
                      </div>
                    </label>
                    <Badge variant={chip.status === 'active' ? 'default' : 'secondary'}>
                      {chip.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedChips.length > 0 && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="text-sm font-medium text-foreground">
                {selectedChips.length} chip{selectedChips.length !== 1 ? 's' : ''} selecionado{selectedChips.length !== 1 ? 's' : ''}
              </div>
              {selectedChips.length < 2 && (
                <div className="text-xs text-orange-600 mt-1">
                  Selecione pelo menos 2 chips para iniciar o aquecimento
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}