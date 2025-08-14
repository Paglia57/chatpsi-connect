-- Atualizar o check constraint para incluir 'text' como tipo válido
ALTER TABLE public.messages 
DROP CONSTRAINT messages_type_check;

-- Recriar o constraint com 'text' e outros tipos válidos
ALTER TABLE public.messages 
ADD CONSTRAINT messages_type_check 
CHECK (type = ANY (ARRAY['text'::text, 'Texto'::text, 'Áudio'::text, 'Imagem'::text, 'Vídeo'::text, 'Documento'::text]));