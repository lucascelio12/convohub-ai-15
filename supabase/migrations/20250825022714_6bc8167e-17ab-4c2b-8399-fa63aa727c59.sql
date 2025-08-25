-- Criar tabela para relacionamento entre campanhas e chips
CREATE TABLE IF NOT EXISTS public.campaign_chips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL,
  chip_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, chip_id)
);

-- Habilitar RLS na tabela campaign_chips
ALTER TABLE public.campaign_chips ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS para campaign_chips
CREATE POLICY "Users can create campaign chips for their campaigns"
ON public.campaign_chips FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM campaigns 
    WHERE campaigns.id = campaign_chips.campaign_id 
    AND campaigns.created_by = auth.uid()
  )
);

CREATE POLICY "Users can view campaign chips from their campaigns"
ON public.campaign_chips FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM campaigns 
    WHERE campaigns.id = campaign_chips.campaign_id 
    AND campaigns.created_by = auth.uid()
  )
);

CREATE POLICY "Users can delete campaign chips from their campaigns"
ON public.campaign_chips FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM campaigns 
    WHERE campaigns.id = campaign_chips.campaign_id 
    AND campaigns.created_by = auth.uid()
  )
);