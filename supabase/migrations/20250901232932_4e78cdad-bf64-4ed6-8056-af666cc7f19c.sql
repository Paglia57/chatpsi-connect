-- Phase 1: Critical Security Fixes

-- 1. Add missing UPDATE policy for messages table
-- This allows users to update their own messages (important for editing/soft delete functionality)
CREATE POLICY "Users can update their own messages" 
ON public.messages 
FOR UPDATE 
USING (auth.uid() = user_id);

-- 2. Security review: The chat-uploads bucket was made public for permanent URLs
-- While this solves the audio URL expiration issue, we should add a note about data sensitivity
-- For production, consider implementing access controls or moving sensitive files to private buckets

-- 3. Clean up: Verify no conflicting policies exist
-- The existing policies look good and follow principle of least privilege