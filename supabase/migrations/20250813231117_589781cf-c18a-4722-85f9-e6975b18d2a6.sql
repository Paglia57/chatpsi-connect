-- Configurar restrições de tipos de arquivo no bucket chat-uploads
-- Atualizar bucket para incluir metadados de tipos permitidos
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'audio/mpeg',          -- .mp3
  'audio/wav',           -- .wav  
  'audio/mp4',           -- .m4a
  'video/mp4',           -- .mp4
  'video/quicktime',     -- .mov
  'image/png',           -- .png
  'image/jpeg',          -- .jpg
  'application/pdf',     -- .pdf
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document' -- .docx
]
WHERE id = 'chat-uploads';

-- Criar política adicional para validar tipos de arquivo no upload
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
  public.validate_file_type(name, mime_type)
);