-- Corrigir problema de recursão infinita na policy de queues
DROP POLICY IF EXISTS "Users can view queues they have access to" ON queues;
DROP POLICY IF EXISTS "Queue creators and managers can update" ON queues;

-- Recriar policies corretas para queues
CREATE POLICY "Users can view queues they have access to" 
ON queues FOR SELECT 
USING (
  auth.uid() = created_by OR 
  EXISTS (
    SELECT 1 FROM queue_managers 
    WHERE queue_managers.queue_id = queues.id 
    AND queue_managers.user_id = auth.uid()
  )
);

CREATE POLICY "Queue creators and managers can update" 
ON queues FOR UPDATE 
USING (
  auth.uid() = created_by OR 
  EXISTS (
    SELECT 1 FROM queue_managers 
    WHERE queue_managers.queue_id = queues.id 
    AND queue_managers.user_id = auth.uid()
  )
);

-- Adicionar coluna color na tabela queues se não existir
ALTER TABLE queues ADD COLUMN IF NOT EXISTS color text DEFAULT '#3B82F6';

-- Atualizar schema da tabela conversations para usar nomes corretos
ALTER TABLE conversations RENAME COLUMN contact_phone TO phone_number;

-- Adicionar conversation_type se não existir
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS conversation_type text DEFAULT 'individual';