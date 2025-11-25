import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, CheckCircle2, AlertCircle, Copy } from "lucide-react";

const formSchema = z.object({
  api_url: z.string().url("URL inválida. Ex: https://evolution.seudominio.com"),
  api_key: z.string().min(10, "API Key deve ter pelo menos 10 caracteres"),
});

type FormData = z.infer<typeof formSchema>;

export default function EvolutionApiSettings() {
  const { currentCompany } = useCompany();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    loadConfig();
  }, [currentCompany]);

  const loadConfig = async () => {
    if (!currentCompany?.id) return;

    const { data, error } = await supabase
      .from("evolution_api_configs")
      .select("*")
      .eq("company_id", currentCompany.id)
      .single();

    if (data) {
      setConfigId(data.id);
      reset({
        api_url: data.api_url,
        api_key: data.api_key,
      });
    }
  };

  const testConnection = async (url: string, apiKey: string) => {
    setConnectionStatus('testing');
    try {
      const response = await fetch(`${url}/instance/fetchInstances`, {
        method: 'GET',
        headers: {
          'apikey': apiKey,
        },
      });

      if (response.ok) {
        setConnectionStatus('success');
        return true;
      } else {
        setConnectionStatus('error');
        return false;
      }
    } catch (error) {
      setConnectionStatus('error');
      return false;
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!currentCompany?.id) {
      toast({
        title: "Erro",
        description: "Empresa não encontrada",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Testar conexão antes de salvar
      const isConnected = await testConnection(data.api_url, data.api_key);
      
      if (!isConnected) {
        toast({
          title: "Aviso",
          description: "Não foi possível conectar com a Evolution API. Verifique a URL e API Key. Configuração salva mesmo assim.",
          variant: "destructive",
        });
      }

      const configData = {
        company_id: currentCompany.id,
        api_url: data.api_url.replace(/\/$/, ''), // Remove trailing slash
        api_key: data.api_key,
        active: true,
      };

      let result;
      if (configId) {
        result = await supabase
          .from("evolution_api_configs")
          .update(configData)
          .eq("id", configId);
      } else {
        result = await supabase
          .from("evolution_api_configs")
          .insert(configData)
          .select()
          .single();
        
        if (result.data) {
          setConfigId(result.data.id);
        }
      }

      if (result.error) throw result.error;

      toast({
        title: "Sucesso",
        description: isConnected 
          ? "Configuração salva e conexão testada com sucesso!"
          : "Configuração salva. Verifique a conexão.",
      });
    } catch (error: any) {
      console.error("Erro ao salvar configuração:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar configuração",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Configuração Evolution API
          </CardTitle>
          <CardDescription>
            Configure a conexão com seu servidor Evolution API para gerenciar chips e mensagens do WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Você precisa ter uma instância da Evolution API rodando em seu servidor.
              <a
                href="https://doc.evolution-api.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 underline hover:text-primary"
              >
                Saiba mais na documentação oficial
              </a>
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="api_url">URL da Evolution API</Label>
              <Input
                id="api_url"
                placeholder="https://evolution.seudominio.com"
                {...register("api_url")}
              />
              {errors.api_url && (
                <p className="text-sm text-destructive">{errors.api_url.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Ex: https://evolution.seudominio.com ou http://192.168.1.100:8080
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="api_key">API Key</Label>
              <Input
                id="api_key"
                type="password"
                placeholder="Sua chave de API"
                {...register("api_key")}
              />
              {errors.api_key && (
                <p className="text-sm text-destructive">{errors.api_key.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                A chave de autenticação configurada no seu servidor Evolution API
              </p>
            </div>

            {connectionStatus === 'success' && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Conexão testada com sucesso!
                </AlertDescription>
              </Alert>
            )}

            {connectionStatus === 'error' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Falha ao conectar. Verifique a URL e API Key.
                </AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Configuração
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {configId && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Configuração de Webhook</CardTitle>
            <CardDescription>
              Configure este webhook na sua Evolution API para receber mensagens automaticamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>URL do Webhook</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value="https://uncjxmnfdidrkakpasjy.supabase.co/functions/v1/evolution-webhook"
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText("https://uncjxmnfdidrkakpasjy.supabase.co/functions/v1/evolution-webhook");
                    toast({
                      title: "Copiado!",
                      description: "URL do webhook copiada para a área de transferência",
                    });
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Cole esta URL nas configurações de webhook da sua Evolution API
              </p>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2 text-sm">
                  <p className="font-medium">Como configurar:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Acesse as configurações da sua instância na Evolution API</li>
                    <li>Adicione um webhook com a URL acima</li>
                    <li>Ative os eventos: messages.upsert, connection.update, qrcode.updated</li>
                    <li>Salve as configurações</li>
                  </ol>
                  <p className="mt-2">
                    Após configurar, as mensagens do WhatsApp aparecerão automaticamente na tela de Conversas.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
