import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Plus, User, Heart, MessageCircle, Send } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { motion, AnimatePresence } from "framer-motion";

interface Achievement {
  id: string;
  title: string;
  description: string;
  category: string | null;
  image_url: string | null;
  likes_count: number | null;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

const CATEGORIES = [
  { value: "career", label: "Career" },
  { value: "finance", label: "Finance" },
  { value: "health", label: "Health & Fitness" },
  { value: "personal", label: "Personal Growth" },
  { value: "business", label: "Business" },
  { value: "learning", label: "Learning" },
];

const Achievements = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [likedAchievements, setLikedAchievements] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("personal");
  const [commentContent, setCommentContent] = useState<Record<string, string>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [celebratingId, setCelebratingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAchievements();
    fetchUserLikes();

    const channel = supabase
      .channel("achievements-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "achievements" }, () => {
        fetchAchievements();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "achievement_likes" }, () => {
        fetchAchievements();
        fetchUserLikes();
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

      if (data) {
        data.forEach((achievement) => fetchComments(achievement.id));
      }
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

  const fetchUserLikes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("achievement_likes")
        .select("achievement_id")
        .eq("user_id", user.id);

      if (error) throw error;
      setLikedAchievements(new Set(data?.map((like) => like.achievement_id) || []));
    } catch (error) {
      console.error("Error fetching likes:", error);
    }
  };

  const fetchComments = async (achievementId: string) => {
    try {
      const { data, error } = await supabase
        .from("achievement_comments")
        .select("*, profiles(username, avatar_url)")
        .eq("achievement_id", achievementId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setComments((prev) => ({ ...prev, [achievementId]: data || [] }));
    } catch (error) {
      console.error("Error loading comments:", error);
    }
  };

  const handleLike = async (achievementId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Please log in",
          description: "You need to be logged in to like achievements.",
          variant: "destructive",
        });
        return;
      }

      const isLiked = likedAchievements.has(achievementId);

      if (isLiked) {
        const { error } = await supabase
          .from("achievement_likes")
          .delete()
          .eq("achievement_id", achievementId)
          .eq("user_id", user.id);

        if (error) throw error;

        await supabase
          .from("achievements")
          .update({ likes_count: (achievements.find(a => a.id === achievementId)?.likes_count || 1) - 1 })
          .eq("id", achievementId);
      } else {
        const { error } = await supabase
          .from("achievement_likes")
          .insert({ achievement_id: achievementId, user_id: user.id });

        if (error) throw error;

        await supabase
          .from("achievements")
          .update({ likes_count: (achievements.find(a => a.id === achievementId)?.likes_count || 0) + 1 })
          .eq("id", achievementId);

        setCelebratingId(achievementId);
        setTimeout(() => setCelebratingId(null), 1000);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleComment = async (achievementId: string) => {
    const content = commentContent[achievementId]?.trim();
    if (!content) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("achievement_comments").insert({
        achievement_id: achievementId,
        user_id: user.id,
        content,
      });

      if (error) throw error;

      setCommentContent((prev) => ({ ...prev, [achievementId]: "" }));
      fetchComments(achievementId);

      toast({
        title: "Comment added",
        description: "Your comment has been posted.",
      });
    } catch (error: any) {
      toast({
        title: "Error posting comment",
        description: error.message,
        variant: "destructive",
      });
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
        category,
      });

      if (error) throw error;

      toast({
        title: "🎉 Achievement shared!",
        description: "Your achievement has been posted successfully.",
      });

      setTitle("");
      setDescription("");
      setCategory("personal");
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
              <DialogTitle className="text-foreground">Share Your Win 🏆</DialogTitle>
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
                <Label htmlFor="achievement-category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="p-6 bg-card border-border hover:shadow-premium transition-shadow relative overflow-hidden">
                <AnimatePresence>
                  {celebratingId === achievement.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center bg-primary/10 z-10"
                    >
                      <Heart className="h-16 w-16 text-primary animate-pulse" />
                    </motion.div>
                  )}
                </AnimatePresence>

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
                  <div className="flex items-center gap-2">
                    {achievement.category && (
                      <span className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary capitalize">
                        {achievement.category}
                      </span>
                    )}
                    <Trophy className="h-6 w-6 text-primary" />
                  </div>
                </div>

                <h3 className="text-lg font-semibold mb-2 text-foreground">{achievement.title}</h3>
                <p className="text-foreground mb-4">{achievement.description}</p>

                <div className="flex items-center gap-4 pt-4 border-t border-border">
                  <button
                    onClick={() => handleLike(achievement.id)}
                    className={`flex items-center gap-1 text-sm transition-colors ${
                      likedAchievements.has(achievement.id)
                        ? "text-primary"
                        : "text-muted-foreground hover:text-primary"
                    }`}
                  >
                    <Heart
                      className={`h-5 w-5 ${likedAchievements.has(achievement.id) ? "fill-current" : ""}`}
                    />
                    {achievement.likes_count || 0}
                  </button>

                  <Collapsible
                    open={openComments[achievement.id]}
                    onOpenChange={(open) => setOpenComments((prev) => ({ ...prev, [achievement.id]: open }))}
                  >
                    <CollapsibleTrigger asChild>
                      <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <MessageCircle className="h-5 w-5" />
                        {comments[achievement.id]?.length || 0}
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="absolute left-0 right-0 bottom-0 translate-y-full bg-card border border-border rounded-b-lg p-4 z-20 shadow-lg">
                      <div className="space-y-3 max-h-48 overflow-y-auto mb-3">
                        {comments[achievement.id]?.map((comment) => (
                          <div key={comment.id} className="flex gap-2">
                            <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                              {comment.profiles.avatar_url ? (
                                <img
                                  src={comment.profiles.avatar_url}
                                  alt=""
                                  className="h-6 w-6 rounded-full"
                                />
                              ) : (
                                <User className="h-3 w-3 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="text-xs text-muted-foreground">{comment.profiles.username}</p>
                              <p className="text-sm text-foreground">{comment.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add a comment..."
                          value={commentContent[achievement.id] || ""}
                          onChange={(e) => setCommentContent((prev) => ({ ...prev, [achievement.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleComment(achievement.id);
                            }
                          }}
                          className="bg-secondary border-border text-sm"
                        />
                        <Button
                          size="icon"
                          onClick={() => handleComment(achievement.id)}
                          className="bg-primary hover:bg-primary/90"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default Achievements;
