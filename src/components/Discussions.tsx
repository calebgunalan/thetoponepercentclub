import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Plus, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Discussion {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

const Discussions = () => {
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const { toast } = useToast();

  useEffect(() => {
    fetchDiscussions();

    const channel = supabase
      .channel("discussions-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "discussions" }, () => {
        fetchDiscussions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDiscussions = async () => {
    try {
      const { data, error } = await supabase
        .from("discussions")
        .select("*, profiles(username, avatar_url)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDiscussions(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading discussions",
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

      const { error } = await supabase.from("discussions").insert({
        user_id: user.id,
        title,
        content,
        category,
      });

      if (error) throw error;

      toast({
        title: "Discussion created",
        description: "Your discussion has been posted successfully.",
      });

      setTitle("");
      setContent("");
      setCategory("general");
      setOpen(false);
    } catch (error: any) {
      toast({
        title: "Error creating discussion",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading discussions...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Discussions</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-gold text-primary-foreground hover:opacity-90">
              <Plus className="mr-2 h-4 w-4" />
              New Discussion
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Start a Discussion</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="mindset">Mindset</SelectItem>
                    <SelectItem value="productivity">Productivity</SelectItem>
                    <SelectItem value="networking">Networking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  rows={4}
                  className="bg-secondary border-border"
                />
              </div>
              <Button type="submit" className="w-full bg-gradient-gold text-primary-foreground hover:opacity-90">
                Post Discussion
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {discussions.length === 0 ? (
          <Card className="p-8 text-center bg-card border-border">
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No discussions yet. Start the conversation!</p>
          </Card>
        ) : (
          discussions.map((discussion) => (
            <Card key={discussion.id} className="p-6 bg-card border-border hover:shadow-premium transition-shadow">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  {discussion.profiles.avatar_url ? (
                    <img
                      src={discussion.profiles.avatar_url}
                      alt={discussion.profiles.username}
                      className="h-10 w-10 rounded-full"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">{discussion.title}</h3>
                    <span className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">
                      {discussion.category}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">by {discussion.profiles.username}</p>
                  <p className="text-foreground">{discussion.content}</p>
                  <p className="text-xs text-muted-foreground mt-3">
                    {new Date(discussion.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Discussions;