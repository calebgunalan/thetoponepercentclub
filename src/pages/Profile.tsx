import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Save, Target, Trophy, Calendar, Flame } from "lucide-react";
import Layout from "@/components/Layout";
import AvatarUpload from "@/components/AvatarUpload";
import ExpertiseTags from "@/components/ExpertiseTags";
import SocialLinks from "@/components/SocialLinks";

interface SocialLinksData {
  linkedin?: string;
  twitter?: string;
  website?: string;
  instagram?: string;
}

interface ProfileData {
  username: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  expertise: string[] | null;
  social_links: Record<string, string> | null;
  points: number | null;
  goals_completed: number | null;
  achievements_count: number | null;
  member_tier: string | null;
  joined_at: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [expertise, setExpertise] = useState<string[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLinksData>({});
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      setUserId(user.id);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (data) {
        const profileData: ProfileData = {
          ...data,
          social_links: data.social_links as Record<string, string> | null,
        };
        setProfile(profileData);
        setUsername(data.username || "");
        setFullName(data.full_name || "");
        setBio(data.bio || "");
        setAvatarUrl(data.avatar_url);
        setExpertise(data.expertise || []);
        setSocialLinks((data.social_links as SocialLinksData) || {});
      }

      // Fetch streak
      const { data: streakData } = await supabase
        .from("user_streaks")
        .select("current_streak")
        .eq("user_id", user.id)
        .single();

      if (streakData) {
        setStreak(streakData.current_streak || 0);
      }
    } catch (error: any) {
      toast({
        title: "Error loading profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const socialLinksJson = socialLinks as Record<string, string>;
      
      const { error } = await supabase
        .from("profiles")
        .update({
          username,
          full_name: fullName,
          bio,
          expertise,
          social_links: socialLinksJson,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getMemberTierColor = (tier: string | null) => {
    switch (tier) {
      case "elite":
        return "text-primary";
      case "established":
        return "text-blue-400";
      case "legend":
        return "text-purple-400";
      default:
        return "text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Your Profile</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-card border-border text-center">
            <Trophy className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">{profile?.achievements_count || 0}</p>
            <p className="text-xs text-muted-foreground">Achievements</p>
          </Card>
          <Card className="p-4 bg-card border-border text-center">
            <Target className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">{profile?.goals_completed || 0}</p>
            <p className="text-xs text-muted-foreground">Goals Completed</p>
          </Card>
          <Card className="p-4 bg-card border-border text-center">
            <Flame className="h-6 w-6 text-orange-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{streak}</p>
            <p className="text-xs text-muted-foreground">Day Streak</p>
          </Card>
          <Card className="p-4 bg-card border-border text-center">
            <Calendar className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">{profile?.points || 0}</p>
            <p className="text-xs text-muted-foreground">Points</p>
          </Card>
        </div>

        <Card className="p-6 bg-card border-border">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 bg-secondary">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="expertise">Expertise</TabsTrigger>
              <TabsTrigger value="social">Social Links</TabsTrigger>
            </TabsList>

            <form onSubmit={handleSave}>
              <TabsContent value="basic" className="space-y-6">
                <div className="flex items-center gap-6">
                  {userId && (
                    <AvatarUpload
                      userId={userId}
                      currentAvatarUrl={avatarUrl}
                      onUploadComplete={setAvatarUrl}
                    />
                  )}
                  <div className="flex-1 space-y-1">
                    <h2 className="text-xl font-semibold">{fullName || username}</h2>
                    <p className="text-muted-foreground">@{username}</p>
                    <p className={`text-sm capitalize ${getMemberTierColor(profile?.member_tier)}`}>
                      {profile?.member_tier || "Rising"} Member
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="bg-secondary border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="bg-secondary border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    placeholder="Tell us about yourself and your journey..."
                    className="bg-secondary border-border"
                  />
                </div>
              </TabsContent>

              <TabsContent value="expertise" className="space-y-6">
                <div>
                  <Label className="text-lg mb-4 block">Areas of Expertise</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add up to 6 areas where you excel or want to grow.
                  </p>
                  <ExpertiseTags tags={expertise} onTagsChange={setExpertise} />
                </div>
              </TabsContent>

              <TabsContent value="social" className="space-y-6">
                <div>
                  <Label className="text-lg mb-4 block">Connect Your Profiles</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add your social links so other members can connect with you.
                  </p>
                  <SocialLinks links={socialLinks} onLinksChange={setSocialLinks} />
                </div>
              </TabsContent>

              <div className="mt-6 pt-6 border-t border-border">
                <Button
                  type="submit"
                  className="w-full bg-gradient-gold text-primary-foreground hover:opacity-90"
                  disabled={saving}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            </form>
          </Tabs>
        </Card>
      </div>
    </Layout>
  );
};

export default Profile;
