-- Fix infinite recursion in RLS policies for queues table
-- Remove conflicting policies that cause infinite recursion

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON queues;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON queues;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON queues;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON queues;

-- Remove conflicting policies for conversations table as well
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON conversations;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON conversations;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON conversations;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON conversations;

-- Keep only the specific RLS policies that don't cause recursion
-- The remaining policies should be sufficient for access control