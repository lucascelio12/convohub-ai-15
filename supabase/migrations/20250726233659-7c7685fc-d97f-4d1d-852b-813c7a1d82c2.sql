-- Add missing UPDATE and DELETE policies for chips table
CREATE POLICY "Admins can update chips" 
ON public.chips 
FOR UPDATE 
USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can delete chips" 
ON public.chips 
FOR DELETE 
USING (get_current_user_role() = 'admin');