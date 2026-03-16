-- Garantir função robusta para criar perfil ao registrar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    company_name,
    segment,
    employees_count,
    role,
    is_active
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'name',
    NEW.raw_user_meta_data ->> 'company_name',
    NEW.raw_user_meta_data ->> 'segment',
    CASE
      WHEN (NEW.raw_user_meta_data ->> 'employees_count') ~ '^[0-9]+$'
        THEN (NEW.raw_user_meta_data ->> 'employees_count')::integer
      ELSE NULL
    END,
    'client'::public.app_role,
    true
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    company_name = COALESCE(EXCLUDED.company_name, public.profiles.company_name),
    segment = COALESCE(EXCLUDED.segment, public.profiles.segment),
    employees_count = COALESCE(EXCLUDED.employees_count, public.profiles.employees_count),
    updated_at = now();

  RETURN NEW;
END;
$$;

-- Recriar trigger de criação automática de perfil
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Backfill de perfis faltantes para usuários já existentes no Auth
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  company_name,
  segment,
  employees_count,
  role,
  is_active
)
SELECT
  u.id,
  u.email,
  u.raw_user_meta_data ->> 'name',
  u.raw_user_meta_data ->> 'company_name',
  u.raw_user_meta_data ->> 'segment',
  CASE
    WHEN (u.raw_user_meta_data ->> 'employees_count') ~ '^[0-9]+$'
      THEN (u.raw_user_meta_data ->> 'employees_count')::integer
    ELSE NULL
  END,
  CASE
    WHEN lower(u.email) = 'wisley_anderson@hotmail.com' THEN 'admin'::public.app_role
    ELSE 'client'::public.app_role
  END,
  true
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- Garantir papel admin para o usuário solicitado
UPDATE public.profiles
SET
  role = 'admin'::public.app_role,
  email = 'wisley_anderson@hotmail.com',
  updated_at = now()
WHERE id = (
  SELECT id
  FROM auth.users
  WHERE lower(email) = 'wisley_anderson@hotmail.com'
  LIMIT 1
)
OR lower(email) = 'wisley_anderson@hotmail.com';