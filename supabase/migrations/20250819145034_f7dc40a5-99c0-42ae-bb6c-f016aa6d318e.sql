-- Corrigir políticas problemáticas que causam recursão infinita
DROP POLICY IF EXISTS "Users can view queues they have access to" ON public.queues;
DROP POLICY IF EXISTS "Users can create queues" ON public.queues;
DROP POLICY IF EXISTS "Queue creators and managers can update" ON public.queues;

-- Criar políticas sem recursão usando a função de segurança
CREATE POLICY "Users can view queues they have access to"
ON public.queues
FOR SELECT
USING (
  (auth.uid() = created_by) OR 
  (company_id = public.get_current_user_company_id()) OR 
  (EXISTS (
    SELECT 1
    FROM queue_managers
    WHERE queue_managers.queue_id = queues.id 
    AND queue_managers.user_id = auth.uid()
  ))
);

CREATE POLICY "Users can create queues"
ON public.queues
FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND
  company_id = public.get_current_user_company_id()
);

CREATE POLICY "Queue creators and managers can update"
ON public.queues
FOR UPDATE
USING (
  (auth.uid() = created_by) OR 
  (EXISTS (
    SELECT 1
    FROM queue_managers
    WHERE queue_managers.queue_id = queues.id 
    AND queue_managers.user_id = auth.uid()
  ))
);

-- Adicionar política para companies que permite visualização
CREATE POLICY "Company members can view their company"
ON public.companies
FOR SELECT
USING (id = public.get_current_user_company_id());

-- Voltar a constraint NOT NULL para created_by
ALTER TABLE public.companies ALTER COLUMN created_by SET NOT NULL;