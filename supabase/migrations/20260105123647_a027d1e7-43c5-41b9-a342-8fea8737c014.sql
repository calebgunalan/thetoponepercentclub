-- =============================================
-- THE TOP 1% CLUB - COMPREHENSIVE DATABASE SCHEMA (PART 1)
-- =============================================

-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- =============================================
-- USER ROLES TABLE (Security)
-- =============================================
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- ENHANCE PROFILES TABLE
-- =============================================
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS expertise TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS achievements_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS goals_completed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS member_tier TEXT DEFAULT 'rising',
ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;

-- =============================================
-- ENHANCE ACHIEVEMENTS TABLE
-- =============================================
ALTER TABLE public.achievements 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general',
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

-- Achievement likes
CREATE TABLE public.achievement_likes (
    achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (achievement_id, user_id)
);

ALTER TABLE public.achievement_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Achievement likes are viewable by authenticated users"
ON public.achievement_likes FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can like achievements"
ON public.achievement_likes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike achievements"
ON public.achievement_likes FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Achievement comments
CREATE TABLE public.achievement_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.achievement_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are viewable by authenticated users"
ON public.achievement_comments FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can create comments"
ON public.achievement_comments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
ON public.achievement_comments FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- =============================================
-- ENHANCE GOALS TABLE
-- =============================================
ALTER TABLE public.goals 
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private',
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general',
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;

-- Accountability partners
CREATE TABLE public.accountability_partners (
    goal_id UUID REFERENCES public.goals(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (goal_id, partner_id)
);

ALTER TABLE public.accountability_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their accountability partnerships"
ON public.accountability_partners FOR SELECT TO authenticated
USING (auth.uid() = partner_id OR EXISTS (
    SELECT 1 FROM public.goals WHERE id = goal_id AND user_id = auth.uid()
));

CREATE POLICY "Goal owners can add partners"
ON public.accountability_partners FOR INSERT TO authenticated
WITH CHECK (EXISTS (
    SELECT 1 FROM public.goals WHERE id = goal_id AND user_id = auth.uid()
));

CREATE POLICY "Users can update their partnership status"
ON public.accountability_partners FOR UPDATE TO authenticated
USING (auth.uid() = partner_id);

-- =============================================
-- ENHANCE MEETINGS TABLE
-- =============================================
ALTER TABLE public.meetings 
ADD COLUMN IF NOT EXISTS meeting_type TEXT DEFAULT 'open',
ADD COLUMN IF NOT EXISTS max_attendees INTEGER,
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';

-- Meeting attendees
CREATE TABLE public.meeting_attendees (
    meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    status TEXT DEFAULT 'registered',
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (meeting_id, user_id)
);

ALTER TABLE public.meeting_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Attendees are viewable by authenticated users"
ON public.meeting_attendees FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can register for meetings"
ON public.meeting_attendees FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their registration"
ON public.meeting_attendees FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can cancel their registration"
ON public.meeting_attendees FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- =============================================
-- ENHANCE DISCUSSIONS TABLE
-- =============================================
ALTER TABLE public.discussions 
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS upvotes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;

-- Discussion upvotes
CREATE TABLE public.discussion_upvotes (
    discussion_id UUID REFERENCES public.discussions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (discussion_id, user_id)
);

ALTER TABLE public.discussion_upvotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Upvotes are viewable by authenticated users"
ON public.discussion_upvotes FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can upvote discussions"
ON public.discussion_upvotes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove upvotes"
ON public.discussion_upvotes FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- =============================================
-- PRIVATE MESSAGING SYSTEM
-- =============================================
CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.conversation_participants (
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_read_at TIMESTAMPTZ,
    PRIMARY KEY (conversation_id, user_id)
);

ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    content TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Conversation RLS policies
CREATE POLICY "Users can view their conversations"
ON public.conversations FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.conversation_participants 
    WHERE conversation_id = id AND user_id = auth.uid()
));

CREATE POLICY "Users can create conversations"
ON public.conversations FOR INSERT TO authenticated
WITH CHECK (true);

-- Participant RLS policies
CREATE POLICY "Users can view conversation participants"
ON public.conversation_participants FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id AND cp.user_id = auth.uid()
));

CREATE POLICY "Users can add participants"
ON public.conversation_participants FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their participation"
ON public.conversation_participants FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- Messages RLS policies
CREATE POLICY "Users can view messages in their conversations"
ON public.messages FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
));

CREATE POLICY "Users can send messages"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM public.conversation_participants
        WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
);

-- =============================================
-- LEARNING RESOURCES
-- =============================================
CREATE TABLE public.learning_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    content TEXT,
    resource_type TEXT NOT NULL,
    category TEXT NOT NULL,
    thumbnail_url TEXT,
    external_url TEXT,
    views_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.learning_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Resources are viewable by authenticated users"
ON public.learning_resources FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can create resources"
ON public.learning_resources FOR INSERT TO authenticated
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their resources"
ON public.learning_resources FOR UPDATE TO authenticated
USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their resources"
ON public.learning_resources FOR DELETE TO authenticated
USING (auth.uid() = author_id);

-- Resource likes
CREATE TABLE public.resource_likes (
    resource_id UUID REFERENCES public.learning_resources(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (resource_id, user_id)
);

ALTER TABLE public.resource_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Resource likes are viewable"
ON public.resource_likes FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can like resources"
ON public.resource_likes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike resources"
ON public.resource_likes FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Resource bookmarks
CREATE TABLE public.resource_bookmarks (
    resource_id UUID REFERENCES public.learning_resources(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (resource_id, user_id)
);

ALTER TABLE public.resource_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their bookmarks"
ON public.resource_bookmarks FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create bookmarks"
ON public.resource_bookmarks FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete bookmarks"
ON public.resource_bookmarks FOR DELETE TO authenticated
USING (auth.uid() = user_id);