-- Temporariamente permitir created_by como NULL
ALTER TABLE public.companies ALTER COLUMN created_by DROP NOT NULL;

-- Criar funções de segurança para evitar recursão
CREATE OR REPLACE FUNCTION public.get_current_user_company_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT company_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Criar empresa padrão
INSERT INTO public.companies (name, slug, created_by)
VALUES ('Empresa Principal', 'empresa-principal', NULL)
ON CONFLICT (slug) DO NOTHING;

-- Atualizar profiles existentes com company_id
UPDATE public.profiles 
SET company_id = (
  SELECT id 
  FROM public.companies 
  WHERE slug = 'empresa-principal' 
  LIMIT 1
)
WHERE company_id IS NULL;

-- Voltar a constraint NOT NULL (primeiro atualizar registros existentes)
UPDATE public.companies 
SET created_by = (
  SELECT user_id 
  FROM public.profiles 
  WHERE role = 'admin' 
  LIMIT 1
)
WHERE created_by IS NULL;

-- Se ainda não houver admin, usar o primeiro usuário
UPDATE public.companies 
SET created_by = (
  SELECT user_id 
  FROM public.profiles 
  LIMIT 1
)
WHERE created_by IS NULL;