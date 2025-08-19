-- Primeiro, criar funções de segurança para evitar recursão
CREATE OR REPLACE FUNCTION public.get_current_user_company_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT company_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Corrigir referência circular na tabela conversations
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_company_id_fkey;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_company_id_fkey 
  FOREIGN KEY (company_id) REFERENCES public.companies(id);

-- Criar empresa padrão se não existir
INSERT INTO public.companies (id, name, slug, created_by)
SELECT 
  gen_random_uuid(),
  'Empresa Principal',
  'empresa-principal',
  (SELECT user_id FROM public.profiles WHERE role = 'admin' LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM public.companies WHERE slug = 'empresa-principal'
);

-- Atualizar profiles existentes com company_id
UPDATE public.profiles 
SET company_id = (
  SELECT id 
  FROM public.companies 
  WHERE slug = 'empresa-principal' 
  LIMIT 1
)
WHERE company_id IS NULL;