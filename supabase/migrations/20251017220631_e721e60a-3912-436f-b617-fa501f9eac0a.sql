-- Fix 1: Restrict message updates to soft-delete only
-- Drop the overly permissive policy that allows updating all fields
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;

-- Create restrictive policy that only allows soft-deletion of user's own messages
CREATE POLICY "Users can soft delete their own user messages"
ON public.messages
FOR UPDATE
USING (
  auth.uid() = user_id 
  AND sender = 'user'
)
WITH CHECK (
  auth.uid() = user_id 
  AND sender = 'user'
  AND is_deleted = true
  -- Ensure only is_deleted can change, all other fields must remain the same
  AND content = (SELECT content FROM messages m WHERE m.id = messages.id)
  AND type = (SELECT type FROM messages m WHERE m.id = messages.id)
  AND sender = (SELECT sender FROM messages m WHERE m.id = messages.id)
  AND media_url IS NOT DISTINCT FROM (SELECT media_url FROM messages m WHERE m.id = messages.id)
  AND metadata IS NOT DISTINCT FROM (SELECT metadata FROM messages m WHERE m.id = messages.id)
  AND thread_id = (SELECT thread_id FROM messages m WHERE m.id = messages.id)
);

-- Fix 2: Make chat-uploads bucket private for proper access control
UPDATE storage.buckets 
SET public = false 
WHERE id = 'chat-uploads';