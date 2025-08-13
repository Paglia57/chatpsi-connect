-- Criar função para atualizar informações básicas do perfil
CREATE OR REPLACE FUNCTION public.update_profile_basic_info(p_full_name text, p_whatsapp text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validação flexível de WhatsApp (aceita formatos brasileiros comuns)
  IF p_whatsapp IS NOT NULL AND p_whatsapp != '' AND 
     p_whatsapp !~ '^\+?55\s?\(?[1-9]{2}\)?\s?9?\d{4}-?\d{4}$|^\+?[1-9]\d{7,14}$' THEN
    RAISE EXCEPTION 'WhatsApp inválido. Use formato brasileiro: +5511999999999 ou (11) 99999-9999';
  END IF;

  -- Validação de nome (não pode ser vazio se fornecido)
  IF p_full_name IS NOT NULL AND TRIM(p_full_name) = '' THEN
    RAISE EXCEPTION 'Nome não pode estar vazio';
  END IF;

  -- Atualizar perfil do usuário autenticado
  UPDATE profiles
  SET 
    full_name = COALESCE(NULLIF(TRIM(p_full_name), ''), full_name),
    whatsapp = CASE 
      WHEN p_whatsapp IS NULL OR TRIM(p_whatsapp) = '' THEN NULL
      ELSE TRIM(p_whatsapp)
    END,
    updated_at = NOW()
  WHERE user_id = auth.uid();

  -- Verificar se o usuário existe
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado ou não autenticado';
  END IF;
END;
$$;

-- Conceder permissão para usuários autenticados
GRANT EXECUTE ON FUNCTION public.update_profile_basic_info(text, text) TO authenticated;