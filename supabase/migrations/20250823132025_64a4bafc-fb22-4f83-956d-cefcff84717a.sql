-- Add DELETE policy for chips table
CREATE POLICY "Users can delete their own chips" 
ON public.chips 
FOR DELETE 
USING (auth.uid() = created_by);