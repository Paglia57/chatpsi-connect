-- Atualizar função validate_file_type para suportar HEIC, HEIF e WEBP
CREATE OR REPLACE FUNCTION public.validate_file_type(filename text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Validar extensão do arquivo (incluindo HEIC, HEIF, WEBP e formatos existentes)
  RETURN (filename ~* '\.(mp3|ogg|wav|m4a|webm|mp4|mov|png|jpg|jpeg|heic|heif|webp|pdf|docx)$');
END;
$function$;