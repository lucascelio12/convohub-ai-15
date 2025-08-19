-- Criar funções de segurança para evitar recursão
CREATE OR REPLACE FUNCTION public.get_current_user_company_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT company_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Criar empresa padrão usando o usuário atual
INSERT INTO public.companies (name, slug, created_by)
VALUES ('Empresa Principal', 'empresa-principal', auth.uid())
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