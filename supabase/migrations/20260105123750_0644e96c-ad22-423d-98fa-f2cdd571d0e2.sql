-- =============================================
-- THE TOP 1% CLUB - DATABASE SCHEMA (PART 2)
-- =============================================

-- =============================================
-- MASTERMIND GROUPS
-- =============================================
CREATE TABLE public.mastermind_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    creator_id UUID NOT NULL,
    focus_area TEXT NOT NULL,
    max_members INTEGER DEFAULT 8,
    meeting_frequency TEXT,
    is_private BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.mastermind_groups ENABLE ROW LEVEL SECURITY;

-- Mastermind members (create before policies that reference it)
CREATE TABLE public.mastermind_members (
    group_id UUID REFERENCES public.mastermind_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role TEXT DEFAULT 'member',
    status TEXT DEFAULT 'pending',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (group_id, user_id)
);

ALTER TABLE public.mastermind_members ENABLE ROW LEVEL SECURITY;

-- Now create policies for mastermind_groups
CREATE POLICY "Public groups are viewable by all authenticated users"
ON public.mastermind_groups FOR SELECT TO authenticated
USING (is_private = false OR EXISTS (
    SELECT 1 FROM public.mastermind_members
    WHERE group_id = id AND user_id = auth.uid()
) OR creator_id = auth.uid());

CREATE POLICY "Users can create groups"
ON public.mastermind_groups FOR INSERT TO authenticated
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update groups"
ON public.mastermind_groups FOR UPDATE TO authenticated
USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete groups"
ON public.mastermind_groups FOR DELETE TO authenticated
USING (auth.uid() = creator_id);

-- Policies for mastermind_members
CREATE POLICY "Members are viewable by group members"
ON public.mastermind_members FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.mastermind_members mm
    WHERE mm.group_id = mastermind_members.group_id AND mm.user_id = auth.uid()
) OR EXISTS (
    SELECT 1 FROM public.mastermind_groups mg
    WHERE mg.id = mastermind_members.group_id AND mg.is_private = false
));

CREATE POLICY "Users can join groups"
ON public.mastermind_members FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Group creators can manage members"
ON public.mastermind_members FOR UPDATE TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.mastermind_groups
    WHERE id = mastermind_members.group_id AND creator_id = auth.uid()
) OR auth.uid() = user_id);

CREATE POLICY "Users can leave or creators can remove"
ON public.mastermind_members FOR DELETE TO authenticated
USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.mastermind_groups
    WHERE id = mastermind_members.group_id AND creator_id = auth.uid()
));

-- =============================================
-- GAMIFICATION - POINTS & LEADERBOARD
-- =============================================
CREATE TABLE public.user_points (
    user_id UUID PRIMARY KEY NOT NULL,
    total_points INTEGER DEFAULT 0,
    weekly_points INTEGER DEFAULT 0,
    monthly_points INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Points are viewable by authenticated users"
ON public.user_points FOR SELECT TO authenticated
USING (true);

CREATE POLICY "System can insert points"
ON public.user_points FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their points"
ON public.user_points FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Point transactions history
CREATE TABLE public.point_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    points INTEGER NOT NULL,
    action_type TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their transactions"
ON public.point_transactions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "System can create transactions"
ON public.point_transactions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- =============================================
-- BADGES SYSTEM
-- =============================================
CREATE TABLE public.badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    icon_name TEXT NOT NULL,
    category TEXT NOT NULL,
    requirement_type TEXT NOT NULL,
    requirement_value INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Badges are viewable by everyone"
ON public.badges FOR SELECT TO authenticated
USING (true);

-- User badges
CREATE TABLE public.user_badges (
    user_id UUID NOT NULL,
    badge_id UUID REFERENCES public.badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, badge_id)
);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User badges are viewable by everyone"
ON public.user_badges FOR SELECT TO authenticated
USING (true);

CREATE POLICY "System can award badges"
ON public.user_badges FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- =============================================
-- STREAKS & DAILY CHALLENGES
-- =============================================
CREATE TABLE public.user_streaks (
    user_id UUID PRIMARY KEY NOT NULL,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Streaks are viewable by everyone"
ON public.user_streaks FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can insert their streaks"
ON public.user_streaks FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streaks"
ON public.user_streaks FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Daily challenges
CREATE TABLE public.daily_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    points_reward INTEGER DEFAULT 25,
    challenge_type TEXT NOT NULL,
    active_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Challenges are viewable by everyone"
ON public.daily_challenges FOR SELECT TO authenticated
USING (true);

-- User challenge completions
CREATE TABLE public.user_challenge_completions (
    user_id UUID NOT NULL,
    challenge_id UUID REFERENCES public.daily_challenges(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, challenge_id)
);

ALTER TABLE public.user_challenge_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Completions are viewable"
ON public.user_challenge_completions FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can complete challenges"
ON public.user_challenge_completions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- =============================================
-- NOTIFICATIONS
-- =============================================
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    link TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their notifications"
ON public.notifications FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update their notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their notifications"
ON public.notifications FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- =============================================
-- STORAGE BUCKETS
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('achievement-images', 'achievement-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('resource-thumbnails', 'resource-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for achievement images
CREATE POLICY "Achievement images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'achievement-images');

CREATE POLICY "Users can upload achievement images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'achievement-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their achievement images"
ON storage.objects FOR DELETE
USING (bucket_id = 'achievement-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for resource thumbnails
CREATE POLICY "Resource thumbnails are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'resource-thumbnails');

CREATE POLICY "Users can upload resource thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'resource-thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their resource thumbnails"
ON storage.objects FOR DELETE
USING (bucket_id = 'resource-thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =============================================
-- ENABLE REALTIME FOR KEY TABLES
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.achievement_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.discussion_upvotes;

-- =============================================
-- SEED INITIAL BADGES
-- =============================================
INSERT INTO public.badges (name, description, icon_name, category, requirement_type, requirement_value) VALUES
('First Step', 'Complete your first action step', 'footprints', 'achievement', 'action_steps_completed', 1),
('Goal Setter', 'Create your first goal', 'target', 'achievement', 'goals_created', 1),
('Goal Crusher', 'Complete 10 goals', 'trophy', 'achievement', 'goals_completed', 10),
('Thought Leader', 'Create 25 discussions', 'lightbulb', 'community', 'discussions_created', 25),
('Helpful Hand', 'Reply to 50 discussions', 'hand-helping', 'community', 'discussion_replies', 50),
('Top Contributor', 'Earn 1000 points', 'crown', 'points', 'total_points', 1000),
('Elite Achiever', 'Earn 5000 points', 'gem', 'points', 'total_points', 5000),
('Consistency King', '30-day login streak', 'flame', 'streak', 'login_streak', 30),
('Knowledge Sharer', 'Share 10 learning resources', 'book-open', 'learning', 'resources_shared', 10),
('Networker', 'Attend 20 meetings', 'users', 'networking', 'meetings_attended', 20)
ON CONFLICT DO NOTHING;