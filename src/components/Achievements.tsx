import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Plus, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Achievement {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

const Achievements = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchAchievements();

    const channel = supabase
      .channel("achievements-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "achievements" }, () => {
        fetchAchievements();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAchievements = async () => {
    try {
      const { data, error } = await supabase
        .from("achievements")
        .select("*, profiles(username, avatar_url)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAchievements(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading achievements",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("achievements").insert({
        user_id: user.id,
        title,
        description,
      });

      if (error) throw error;

      toast({
        title: "Achievement shared!",
        description: "Your achievement has been posted successfully.",
      });

      setTitle("");
      setDescription("");
      setOpen(false);
    } catch (error: any) {
      toast({
        title: "Error sharing achievement",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading achievements...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Achievements</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-gold text-primary-foreground hover:opacity-90">
              <Plus className="mr-2 h-4 w-4" />
              Share Achievement
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Share Your Win</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="achievement-title">Title</Label>
                <Input
                  id="achievement-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="e.g., Hit $1M in revenue"
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="achievement-description">Description</Label>
                <Textarea
                  id="achievement-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={4}
                  placeholder="Share your story..."
                  className="bg-secondary border-border"
                />
              </div>
              <Button type="submit" className="w-full bg-gradient-gold text-primary-foreground hover:opacity-90">
                Share Achievement
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {achievements.length === 0 ? (
          <Card className="p-8 text-center bg-card border-border md:col-span-2">
            <Trophy className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No achievements yet. Be the first to share your win!</p>
          </Card>
        ) : (
          achievements.map((achievement) => (
            <Card key={achievement.id} className="p-6 bg-card border-border hover:shadow-premium transition-shadow">
              <div className="flex items-start gap-3 mb-4">
                {achievement.profiles.avatar_url ? (
                  <img
                    src={achievement.profiles.avatar_url}
                    alt={achievement.profiles.username}
                    className="h-10 w-10 rounded-full"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">{achievement.profiles.username}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(achievement.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">{achievement.title}</h3>
              <p className="text-foreground">{achievement.description}</p>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Achievements;