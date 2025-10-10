-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone" 
  ON public.profiles FOR SELECT 
  USING (true);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Create discussions table
CREATE TABLE public.discussions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Discussions are viewable by authenticated users" 
  ON public.discussions FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Users can create discussions" 
  ON public.discussions FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own discussions" 
  ON public.discussions FOR UPDATE 
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own discussions" 
  ON public.discussions FOR DELETE 
  TO authenticated
  USING (auth.uid() = user_id);

-- Create discussion replies table
CREATE TABLE public.discussion_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  discussion_id UUID NOT NULL REFERENCES public.discussions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.discussion_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Replies are viewable by authenticated users" 
  ON public.discussion_replies FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Users can create replies" 
  ON public.discussion_replies FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own replies" 
  ON public.discussion_replies FOR DELETE 
  TO authenticated
  USING (auth.uid() = user_id);

-- Create achievements table
CREATE TABLE public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Achievements are viewable by authenticated users" 
  ON public.achievements FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own achievements" 
  ON public.achievements FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own achievements" 
  ON public.achievements FOR UPDATE 
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own achievements" 
  ON public.achievements FOR DELETE 
  TO authenticated
  USING (auth.uid() = user_id);

-- Create goals table
CREATE TABLE public.goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'paused')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own goals" 
  ON public.goals FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own goals" 
  ON public.goals FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals" 
  ON public.goals FOR UPDATE 
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals" 
  ON public.goals FOR DELETE 
  TO authenticated
  USING (auth.uid() = user_id);

-- Create action steps table
CREATE TABLE public.action_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.action_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own action steps" 
  ON public.action_steps FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own action steps" 
  ON public.action_steps FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own action steps" 
  ON public.action_steps FOR UPDATE 
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own action steps" 
  ON public.action_steps FOR DELETE 
  TO authenticated
  USING (auth.uid() = user_id);

-- Create meetings table
CREATE TABLE public.meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  meeting_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  meeting_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Meetings are viewable by authenticated users" 
  ON public.meetings FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Users can create meetings" 
  ON public.meetings FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Organizers can update their meetings" 
  ON public.meetings FOR UPDATE 
  TO authenticated
  USING (auth.uid() = organizer_id);

CREATE POLICY "Organizers can delete their meetings" 
  ON public.meetings FOR DELETE 
  TO authenticated
  USING (auth.uid() = organizer_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_discussions_updated_at
  BEFORE UPDATE ON public.discussions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for discussions and achievements
ALTER PUBLICATION supabase_realtime ADD TABLE public.discussions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.discussion_replies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.achievements;