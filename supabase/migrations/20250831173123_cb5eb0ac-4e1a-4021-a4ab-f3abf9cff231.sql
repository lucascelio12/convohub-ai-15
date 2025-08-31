-- Remove all existing RLS policies on queues to fix infinite recursion
DROP POLICY IF EXISTS "Users can view queues they have access to" ON queues;
DROP POLICY IF EXISTS "Users can create queues" ON queues;
DROP POLICY IF EXISTS "Queue creators and managers can update" ON queues;

-- Create simple RLS policies that don't cause recursion
CREATE POLICY "Allow authenticated users to view queues" ON queues
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to insert queues" ON queues
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Allow creators to update queues" ON queues
    FOR UPDATE TO authenticated
    USING (auth.uid() = created_by);

CREATE POLICY "Allow creators to delete queues" ON queues
    FOR DELETE TO authenticated
    USING (auth.uid() = created_by);