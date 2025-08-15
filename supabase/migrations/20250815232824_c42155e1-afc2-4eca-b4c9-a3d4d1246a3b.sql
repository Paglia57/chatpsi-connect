-- Add DELETE RLS policies for profiles table
CREATE POLICY "Users can delete their own profile" 
ON public.profiles 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add DELETE RLS policies for messages table  
CREATE POLICY "Users can delete their own messages" 
ON public.messages 
FOR DELETE 
USING (auth.uid() = user_id);