-- Corrigir políticas de queue_managers que causam recursão infinita
DROP POLICY IF EXISTS "Queue creators and admins can delete queue managers" ON public.queue_managers;
DROP POLICY IF EXISTS "Queue creators and admins can manage queue managers" ON public.queue_managers;
DROP POLICY IF EXISTS "Queue creators and admins can update queue managers" ON public.queue_managers;
DROP POLICY IF EXISTS "Users can view queue managers" ON public.queue_managers;

-- Criar políticas mais simples sem recursão
CREATE POLICY "Queue managers can view their own records"
ON public.queue_managers
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Queue creators can manage queue managers"
ON public.queue_managers
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.queues 
    WHERE queues.id = queue_managers.queue_id 
    AND queues.created_by = auth.uid()
  )
);

-- Os avisos de segurança restantes são configurações do Supabase que devem ser ajustadas no dashboard:
-- 1. Auth OTP long expiry - configuração de autenticação
-- 2. Leaked Password Protection - configuração de senha
-- Estes não podem ser corrigidos via SQL, são configurações da plataforma