-- Atualizar trigger para incluir company_id ao criar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email, role, company_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    COALESCE(
      (NEW.raw_user_meta_data->>'company_id')::uuid,
      (SELECT id FROM public.companies WHERE slug = 'empresa-principal' LIMIT 1)
    )
  );
  RETURN NEW;
END;
$$;