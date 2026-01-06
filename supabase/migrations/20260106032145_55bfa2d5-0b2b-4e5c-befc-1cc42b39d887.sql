-- Add foreign key constraint from achievement_comments to profiles
ALTER TABLE public.achievement_comments 
ADD CONSTRAINT achievement_comments_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key constraint from meeting_attendees to profiles
ALTER TABLE public.meeting_attendees 
ADD CONSTRAINT meeting_attendees_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;