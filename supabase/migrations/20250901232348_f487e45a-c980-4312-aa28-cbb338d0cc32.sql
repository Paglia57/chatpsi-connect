-- Tornar o bucket chat-uploads público para URLs permanentes de áudio
UPDATE storage.buckets 
SET public = true 
WHERE id = 'chat-uploads';