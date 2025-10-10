-- 1. Criar enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. Criar tabela de roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz DEFAULT NOW(),
  created_by uuid,
  UNIQUE (user_id, role)
);

-- 3. Criar índice para performance
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

-- 4. Habilitar RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5. Criar função SECURITY DEFINER para verificar role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 6. Criar função para verificar se usuário atual é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::app_role)
$$;

-- 7. RLS Policies para user_roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.is_admin());

-- 8. Criar função para admins gerenciarem profiles
CREATE OR REPLACE FUNCTION public.admin_update_profile(
  p_user_id uuid,
  p_email text DEFAULT NULL,
  p_full_name text DEFAULT NULL,
  p_whatsapp text DEFAULT NULL,
  p_nickname text DEFAULT NULL,
  p_subscription_active boolean DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem executar esta ação.';
  END IF;

  UPDATE public.profiles
  SET
    email = COALESCE(p_email, email),
    full_name = COALESCE(p_full_name, full_name),
    whatsapp = COALESCE(p_whatsapp, whatsapp),
    nickname = COALESCE(p_nickname, nickname),
    subscription_active = COALESCE(p_subscription_active, subscription_active),
    updated_at = NOW()
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil não encontrado';
  END IF;
END;
$$;

-- 9. Criar função para limpar histórico (thread_id)
CREATE OR REPLACE FUNCTION public.admin_clear_thread(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem executar esta ação.';
  END IF;

  UPDATE public.profiles
  SET 
    openai_thread_id = NULL,
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$;

-- 10. Criar função para deletar perfil
CREATE OR REPLACE FUNCTION public.admin_delete_profile(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem executar esta ação.';
  END IF;

  DELETE FROM public.profiles WHERE user_id = p_user_id;
END;
$$;

-- 11. RLS Policy para admins verem todos os profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR public.is_admin()
);