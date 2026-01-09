import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import BadgeDisplay from "@/components/BadgeDisplay";
import { useToast } from "@/hooks/use-toast";
import { 
  Calendar, Trophy, Target, MessageSquare, 
  Linkedin, Twitter, Globe, ArrowLeft, Flame
} from "lucide-react";
import { motion } from "framer-motion";

interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  expertise: string[] | null;
  social_links: {
    linkedin?: string;
    twitter?: string;
    website?: string;
  } | null;
  achievements_count: number | null;
  goals_completed: number | null;
  points: number | null;
  member_tier: string | null;
  joined_at: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  category: string | null;
  created_at: string;
}

interface Streak {
  current_streak: number | null;
  longest_streak: number | null;
}

const TIER_COLORS: Record<string, string> = {
  rising: "from-gray-400 to-gray-500",
  established: "from-blue-400 to-blue-600",
  elite: "from-purple-400 to-purple-600",
  legend: "from-yellow-400 to-amber-600",
};

const PublicProfile = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchCurrentUser();
    if (username) {
      fetchProfile();
    }
  }, [username]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const fetchProfile = async () => {
    try {
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .single();

      if (error) throw error;
      
      // Parse social_links safely
      const socialLinks = profileData.social_links as Profile['social_links'];
      setProfile({
        ...profileData,
        social_links: socialLinks
      });

      // Fetch achievements
      const { data: achievementsData } = await supabase
        .from("achievements")
        .select("id, title, description, category, created_at")
        .eq("user_id", profileData.id)
        .order("created_at", { ascending: false })
        .limit(6);

      setAchievements(achievementsData || []);

      // Fetch streak
      const { data: streakData } = await supabase
        .from("user_streaks")
        .select("current_streak, longest_streak")
        .eq("user_id", profileData.id)
        .single();

      setStreak(streakData);
    } catch (error: any) {
      toast({
        title: "Profile not found",
        description: "This user doesn't exist.",
        variant: "destructive",
      });
      navigate("/members");
    } finally {
      setLoading(false);
    }
  };

  const startConversation = async () => {
    if (!profile || !currentUserId) return;
    navigate("/messages");
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-muted-foreground">Loading profile...</div>
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Profile not found</p>
        </div>
      </Layout>
    );
  }

  const isOwnProfile = currentUserId === profile.id;
  const tierColor = TIER_COLORS[profile.member_tier || "rising"];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-8 bg-card border-border">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <Avatar className="h-32 w-32 border-4 border-primary/20">
                <AvatarImage src={profile.avatar_url || ""} />
                <AvatarFallback className="text-4xl bg-gradient-gold text-primary-foreground">
                  {profile.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold">
                    {profile.full_name || profile.username}
                  </h1>
                  <Badge className={`bg-gradient-to-r ${tierColor} text-white border-0`}>
                    {(profile.member_tier || "rising").charAt(0).toUpperCase() + (profile.member_tier || "rising").slice(1)}
                  </Badge>
                </div>
                
                <p className="text-muted-foreground mb-4">@{profile.username}</p>
                
                {profile.bio && (
                  <p className="text-foreground mb-4">{profile.bio}</p>
                )}

                {/* Expertise Tags */}
                {profile.expertise && profile.expertise.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {profile.expertise.map((skill, index) => (
                      <Badge key={index} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Social Links */}
                <div className="flex gap-3 mb-4">
                  {profile.social_links?.linkedin && (
                    <a
                      href={profile.social_links.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Linkedin className="h-5 w-5" />
                    </a>
                  )}
                  {profile.social_links?.twitter && (
                    <a
                      href={profile.social_links.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Twitter className="h-5 w-5" />
                    </a>
                  )}
                  {profile.social_links?.website && (
                    <a
                      href={profile.social_links.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Globe className="h-5 w-5" />
                    </a>
                  )}
                </div>

                {/* Action Button */}
                {!isOwnProfile && currentUserId && (
                  <Button onClick={startConversation} className="bg-primary hover:bg-primary/90">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                )}
                {isOwnProfile && (
                  <Button onClick={() => navigate("/profile")} variant="outline">
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <Card className="p-4 text-center bg-card border-border">
            <Trophy className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
            <p className="text-2xl font-bold">{profile.achievements_count || 0}</p>
            <p className="text-sm text-muted-foreground">Achievements</p>
          </Card>
          <Card className="p-4 text-center bg-card border-border">
            <Target className="h-6 w-6 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{profile.goals_completed || 0}</p>
            <p className="text-sm text-muted-foreground">Goals Completed</p>
          </Card>
          <Card className="p-4 text-center bg-card border-border">
            <Flame className="h-6 w-6 mx-auto mb-2 text-orange-500" />
            <p className="text-2xl font-bold">{streak?.current_streak || 0}</p>
            <p className="text-sm text-muted-foreground">Day Streak</p>
          </Card>
          <Card className="p-4 text-center bg-card border-border">
            <Calendar className="h-6 w-6 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">
              {new Date(profile.joined_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
            </p>
            <p className="text-sm text-muted-foreground">Joined</p>
          </Card>
        </motion.div>

        {/* Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6 bg-card border-border">
            <BadgeDisplay userId={profile.id} />
          </Card>
        </motion.div>

        {/* Recent Achievements */}
        {achievements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="p-6 bg-card border-border">
              <h3 className="text-xl font-semibold mb-4">Recent Achievements</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className="p-4 rounded-lg bg-secondary/50 border border-border"
                  >
                    <h4 className="font-medium mb-1">{achievement.title}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {achievement.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(achievement.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </Layout>
  );
};

export default PublicProfile;
