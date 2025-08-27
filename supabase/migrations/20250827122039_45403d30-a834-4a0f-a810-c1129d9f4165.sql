-- Criar tabela para configurações de webhooks
CREATE TABLE public.webhook_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('n8n', 'typebot', 'zapier', 'generic')),
  url TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'POST' CHECK (method IN ('GET', 'POST', 'PUT')),
  headers JSONB,
  payload_template TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.webhook_configs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para webhooks por empresa
CREATE POLICY "Users can view webhooks from their company" 
ON public.webhook_configs 
FOR SELECT 
USING (company_id = get_current_user_company_id());

CREATE POLICY "Users can create webhooks for their company" 
ON public.webhook_configs 
FOR INSERT 
WITH CHECK (
  company_id = get_current_user_company_id() 
  AND created_by = auth.uid()
);

CREATE POLICY "Users can update webhooks from their company" 
ON public.webhook_configs 
FOR UPDATE 
USING (company_id = get_current_user_company_id());

CREATE POLICY "Users can delete webhooks from their company" 
ON public.webhook_configs 
FOR DELETE 
USING (company_id = get_current_user_company_id());

-- Trigger para atualizar updated_at
CREATE TRIGGER update_webhook_configs_updated_at
BEFORE UPDATE ON public.webhook_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para melhor performance
CREATE INDEX idx_webhook_configs_company_id ON public.webhook_configs(company_id);
CREATE INDEX idx_webhook_configs_active ON public.webhook_configs(active);
CREATE INDEX idx_webhook_configs_type ON public.webhook_configs(type);