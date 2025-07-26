-- Função para incrementar uso do chip
CREATE OR REPLACE FUNCTION public.increment_chip_usage(chip_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  UPDATE public.chips 
  SET current_usage = current_usage + 1,
      updated_at = now()
  WHERE id = chip_id;
END;
$$;