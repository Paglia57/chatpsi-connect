-- Update the messages table type constraint to accept English values only
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_type_check;

-- Add new constraint with English values
ALTER TABLE messages ADD CONSTRAINT messages_type_check 
CHECK (type IN ('text', 'audio', 'image', 'video', 'document'));