-- Configurar restrições de tipos de arquivo no bucket chat-uploads
-- Criar função para validar tipos de arquivo
CREATE OR REPLACE FUNCTION public.validate_file_type(filename text, content_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validar extensão e tipo MIME
  RETURN (
    (filename ~* '\.(mp3|wav|m4a|mp4|mov|png|jpg|jpeg|pdf|docx)$') AND
    (content_type = ANY(ARRAY[
      'audio/mpeg',
      'audio/wav', 
      'audio/mp4',
      'video/mp4',
      'video/quicktime',
      'image/png',
      'image/jpeg',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]))
  );
END;
$$;

-- Atualizar política de upload para incluir validação de tipo
DROP POLICY IF EXISTS "Users can upload their own files" ON storage.objects;

CREATE POLICY "Users can upload their own files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'chat-uploads' AND 
  auth.uid()::text = (storage.foldername(name))[1] AND
  public.validate_file_type(name, content_type)
);