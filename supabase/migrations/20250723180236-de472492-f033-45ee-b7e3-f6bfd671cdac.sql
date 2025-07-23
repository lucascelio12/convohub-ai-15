-- Fix security issues by adding missing RLS policies and fixing function search paths

-- Add missing RLS policies for queue_managers
CREATE POLICY "Admins can manage queue_managers" ON public.queue_managers FOR ALL USING (
  public.get_current_user_role() = 'admin'
);

-- Add missing RLS policies for messages
CREATE POLICY "Users can view messages based on conversation access" ON public.messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
    AND (
      public.get_current_user_role() = 'admin' OR 
      (public.get_current_user_role() = 'manager' AND EXISTS (
        SELECT 1 FROM public.queue_managers qm
        INNER JOIN public.profiles p ON p.id = qm.manager_id
        WHERE p.user_id = auth.uid() AND qm.queue_id = c.queue_id
      )) OR
      (public.get_current_user_role() = 'agent' AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = auth.uid() AND p.id = c.assigned_to
      ))
    )
  )
);

CREATE POLICY "Users can insert messages to accessible conversations" ON public.messages FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
    AND (
      public.get_current_user_role() = 'admin' OR 
      (public.get_current_user_role() = 'manager' AND EXISTS (
        SELECT 1 FROM public.queue_managers qm
        INNER JOIN public.profiles p ON p.id = qm.manager_id
        WHERE p.user_id = auth.uid() AND qm.queue_id = c.queue_id
      )) OR
      (public.get_current_user_role() = 'agent' AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = auth.uid() AND p.id = c.assigned_to
      ))
    )
  )
);

-- Add missing RLS policies for campaigns
CREATE POLICY "Admins can manage campaigns" ON public.campaigns FOR ALL USING (
  public.get_current_user_role() = 'admin'
);
CREATE POLICY "Managers can view campaigns" ON public.campaigns FOR SELECT USING (
  public.get_current_user_role() IN ('admin', 'manager')
);

-- Fix function search paths
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT 
LANGUAGE SQL 
SECURITY DEFINER 
STABLE
SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;