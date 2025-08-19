-- Primeiro, criar tabela de empresas
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  domain TEXT,
  logo_url TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'Brasil',
  subscription_plan TEXT DEFAULT 'basic',
  max_users INTEGER DEFAULT 10,
  max_chips INTEGER DEFAULT 5,
  max_queues INTEGER DEFAULT 10,
  active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS na tabela companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Políticas básicas para companies
CREATE POLICY "Company creators can manage their companies"
ON public.companies
FOR ALL
USING (auth.uid() = created_by);

-- Adicionar company_id nas tabelas existentes
ALTER TABLE public.profiles ADD COLUMN company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.chips ADD COLUMN company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.queues ADD COLUMN company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.campaigns ADD COLUMN company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.conversations ADD COLUMN company_id UUID REFERENCES public.companies(id);

-- Função para atualizar updated_at automaticamente
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();