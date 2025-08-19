-- Criar tabela de empresas
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

-- Políticas para companies
CREATE POLICY "Company creators can manage their companies"
ON public.companies
FOR ALL
USING (auth.uid() = created_by);

CREATE POLICY "Company members can view their company"
ON public.companies
FOR SELECT
USING (
  id IN (
    SELECT company_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

-- Adicionar company_id nas tabelas existentes
ALTER TABLE public.profiles ADD COLUMN company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.chips ADD COLUMN company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.queues ADD COLUMN company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.campaigns ADD COLUMN company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.conversations ADD COLUMN company_id UUID REFERENCES public.conversations(id);

-- Atualizar políticas existentes para incluir company_id
DROP POLICY IF EXISTS "Users can view their own campaigns" ON public.campaigns;
CREATE POLICY "Users can view their own campaigns"
ON public.campaigns
FOR SELECT
USING (
  auth.uid() = created_by OR 
  company_id IN (
    SELECT company_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can create campaigns" ON public.campaigns;
CREATE POLICY "Users can create campaigns"
ON public.campaigns
FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND
  company_id IN (
    SELECT company_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update their own campaigns" ON public.campaigns;
CREATE POLICY "Users can update their own campaigns"
ON public.campaigns
FOR UPDATE
USING (
  auth.uid() = created_by OR 
  company_id IN (
    SELECT company_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

-- Atualizar política de chips
DROP POLICY IF EXISTS "Users can view chips they have access to" ON public.chips;
CREATE POLICY "Users can view chips they have access to"
ON public.chips
FOR SELECT
USING (
  (auth.uid() = created_by) OR 
  (company_id IN (
    SELECT company_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )) OR 
  (EXISTS (
    SELECT 1
    FROM user_permissions
    WHERE user_permissions.user_id = auth.uid() 
    AND user_permissions.resource_type = 'chip' 
    AND user_permissions.resource_id = chips.id
  ))
);

DROP POLICY IF EXISTS "Users can create chips" ON public.chips;
CREATE POLICY "Users can create chips"
ON public.chips
FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND
  company_id IN (
    SELECT company_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

-- Atualizar política de queues
DROP POLICY IF EXISTS "Users can view queues they have access to" ON public.queues;
CREATE POLICY "Users can view queues they have access to"
ON public.queues
FOR SELECT
USING (
  (auth.uid() = created_by) OR 
  (company_id IN (
    SELECT company_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )) OR 
  (EXISTS (
    SELECT 1
    FROM queue_managers
    WHERE queue_managers.queue_id = queues.id 
    AND queue_managers.user_id = auth.uid()
  ))
);

DROP POLICY IF EXISTS "Users can create queues" ON public.queues;
CREATE POLICY "Users can create queues"
ON public.queues
FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND
  company_id IN (
    SELECT company_id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

-- Função para atualizar updated_at automaticamente
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Criar empresa padrão para usuários existentes
INSERT INTO public.companies (id, name, slug, created_by)
SELECT 
  gen_random_uuid(),
  'Empresa Principal',
  'empresa-principal',
  user_id
FROM public.profiles 
WHERE role = 'admin'
LIMIT 1;

-- Atualizar profiles existentes com company_id
UPDATE public.profiles 
SET company_id = (
  SELECT id 
  FROM public.companies 
  WHERE name = 'Empresa Principal' 
  LIMIT 1
)
WHERE company_id IS NULL;