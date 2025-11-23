-- Create table for Evolution API configurations
CREATE TABLE IF NOT EXISTS public.evolution_api_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id),
  api_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.evolution_api_configs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their company's Evolution API config"
  ON public.evolution_api_configs
  FOR SELECT
  USING (company_id = get_current_user_company_id());

CREATE POLICY "Users can insert their company's Evolution API config"
  ON public.evolution_api_configs
  FOR INSERT
  WITH CHECK (company_id = get_current_user_company_id());

CREATE POLICY "Users can update their company's Evolution API config"
  ON public.evolution_api_configs
  FOR UPDATE
  USING (company_id = get_current_user_company_id());

CREATE POLICY "Users can delete their company's Evolution API config"
  ON public.evolution_api_configs
  FOR DELETE
  USING (company_id = get_current_user_company_id());

-- Add trigger for updated_at
CREATE TRIGGER update_evolution_api_configs_updated_at
  BEFORE UPDATE ON public.evolution_api_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();