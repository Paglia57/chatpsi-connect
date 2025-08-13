-- Create storage bucket for chat uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-uploads', 'chat-uploads', false);

-- Create policies for chat uploads
CREATE POLICY "Users can upload their own files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'chat-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'chat-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'chat-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'chat-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Update messages table to support better metadata
ALTER TABLE messages ADD COLUMN IF NOT EXISTS thread_id uuid REFERENCES profiles(user_id);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender text CHECK (sender IN ('user', 'assistant')) DEFAULT 'user';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;