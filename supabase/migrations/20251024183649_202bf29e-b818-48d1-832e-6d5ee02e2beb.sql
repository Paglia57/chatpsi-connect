-- Tornar o bucket chat-uploads público para URLs permanentes
UPDATE storage.buckets 
SET public = true 
WHERE id = 'chat-uploads';