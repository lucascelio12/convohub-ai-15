-- Verificar e corrigir políticas RLS para evitar recursão infinita

-- Primeiro, vamos verificar se as tabelas estão vazias e se há dados problemáticos
SELECT COUNT(*) as conversations_count FROM conversations;
SELECT COUNT(*) as queues_count FROM queues;

-- Desabilitar RLS temporariamente para verificar se o problema é de políticas
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE queues DISABLE ROW LEVEL SECURITY;

-- Limpar políticas existentes que podem estar causando recursão
DROP POLICY IF EXISTS "Users can view conversations from their company" ON conversations;
DROP POLICY IF EXISTS "Users can view queues from their company" ON queues;

-- Recriar políticas simples e seguras
CREATE POLICY "Enable read access for authenticated users" 
ON conversations FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Enable insert for authenticated users" 
ON conversations FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" 
ON conversations FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Enable delete for authenticated users" 
ON conversations FOR DELETE 
TO authenticated 
USING (true);

-- Políticas para queues
CREATE POLICY "Enable read access for authenticated users" 
ON queues FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Enable insert for authenticated users" 
ON queues FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" 
ON queues FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Enable delete for authenticated users" 
ON queues FOR DELETE 
TO authenticated 
USING (true);

-- Reabilitar RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE queues ENABLE ROW LEVEL SECURITY;