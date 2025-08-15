-- Update validate_file_type function to include .ogg extension
CREATE OR REPLACE FUNCTION public.validate_file_type(filename text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- Validar extensão do arquivo (incluindo .ogg para áudio)
  RETURN (filename ~* '\.(mp3|ogg|wav|m4a|mp4|mov|png|jpg|jpeg|pdf|docx)$');
END;
$function$;