-- Add foreign key for conversation_participants to profiles
ALTER TABLE conversation_participants 
ADD CONSTRAINT conversation_participants_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;