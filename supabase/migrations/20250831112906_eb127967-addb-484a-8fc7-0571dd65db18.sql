-- Create bot_flows table
CREATE TABLE public.bot_flows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT false,
  nodes JSONB DEFAULT '[]'::jsonb,
  edges JSONB DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bot_flows ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own flows" 
ON public.bot_flows 
FOR SELECT 
USING (auth.uid() = created_by);

CREATE POLICY "Users can create flows" 
ON public.bot_flows 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own flows" 
ON public.bot_flows 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own flows" 
ON public.bot_flows 
FOR DELETE 
USING (auth.uid() = created_by);

-- Create trigger for updated_at
CREATE TRIGGER update_bot_flows_updated_at
BEFORE UPDATE ON public.bot_flows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();