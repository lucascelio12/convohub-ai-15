-- Add scheduling and new status fields to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN scheduled_date DATE,
ADD COLUMN scheduled_time TIME,
ADD COLUMN is_scheduled BOOLEAN DEFAULT false;

-- Update status column to allow new status values
-- First, let's see the current constraint
ALTER TABLE public.campaigns 
DROP CONSTRAINT IF EXISTS campaigns_status_check;

-- Add new constraint with all status values
ALTER TABLE public.campaigns 
ADD CONSTRAINT campaigns_status_check 
CHECK (status IN ('draft', 'programmed', 'in_progress', 'paused', 'finished', 'pending', 'cancelled'));

-- Update default status to 'draft'  
ALTER TABLE public.campaigns 
ALTER COLUMN status SET DEFAULT 'draft';

-- Create index for scheduled campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled ON public.campaigns(scheduled_date, scheduled_time) 
WHERE is_scheduled = true;