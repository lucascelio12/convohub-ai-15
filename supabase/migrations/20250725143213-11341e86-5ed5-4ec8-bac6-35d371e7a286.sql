-- Add queue_id column to chips table to associate chips with queues
ALTER TABLE public.chips 
ADD COLUMN queue_id UUID REFERENCES public.queues(id) ON DELETE SET NULL;