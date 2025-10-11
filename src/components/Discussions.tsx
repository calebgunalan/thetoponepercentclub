import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Plus, User, MessageCircle, Send } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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

interface Reply {
  id: string;
  content: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

const Discussions = () => {
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [replies, setReplies] = useState<Record<string, Reply[]>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [replyContent, setReplyContent] = useState<Record<string, string>>({});
  const [openDiscussions, setOpenDiscussions] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchDiscussions();

    const discussionsChannel = supabase
      .channel("discussions-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "discussions" }, () => {
        fetchDiscussions();
      })
      .subscribe();

    const repliesChannel = supabase
      .channel("replies-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "discussion_replies" }, (payload: any) => {
        if (payload.eventType === "INSERT") {
          fetchReplies(payload.new.discussion_id);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(discussionsChannel);
      supabase.removeChannel(repliesChannel);
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
      
      // Fetch replies for all discussions
      if (data) {
        data.forEach((discussion) => fetchReplies(discussion.id));
      }
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

  const fetchReplies = async (discussionId: string) => {
    try {
      const { data, error } = await supabase
        .from("discussion_replies")
        .select("*, profiles(username, avatar_url)")
        .eq("discussion_id", discussionId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setReplies((prev) => ({ ...prev, [discussionId]: data || [] }));
    } catch (error: any) {
      console.error("Error loading replies:", error);
    }
  };

  const handleReply = async (discussionId: string) => {
    const content = replyContent[discussionId]?.trim();
    if (!content) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("discussion_replies").insert({
        discussion_id: discussionId,
        user_id: user.id,
        content,
      });

      if (error) throw error;

      setReplyContent((prev) => ({ ...prev, [discussionId]: "" }));
      fetchReplies(discussionId);
      
      toast({
        title: "Reply posted",
        description: "Your reply has been added.",
      });
    } catch (error: any) {
      toast({
        title: "Error posting reply",
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
                  <p className="text-foreground mb-3">{discussion.content}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(discussion.created_at).toLocaleDateString()}
                  </p>

                  <Collapsible
                    open={openDiscussions[discussion.id]}
                    onOpenChange={(open) => setOpenDiscussions((prev) => ({ ...prev, [discussion.id]: open }))}
                    className="mt-4"
                  >
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-2">
                        <MessageCircle className="h-4 w-4" />
                        {replies[discussion.id]?.length || 0} Replies
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-4 space-y-4">
                      {replies[discussion.id]?.map((reply) => (
                        <div key={reply.id} className="flex gap-3 pl-4 border-l-2 border-primary/20">
                          <div className="flex-shrink-0">
                            {reply.profiles.avatar_url ? (
                              <img
                                src={reply.profiles.avatar_url}
                                alt={reply.profiles.username}
                                className="h-8 w-8 rounded-full"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                                <User className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{reply.profiles.username}</p>
                            <p className="text-sm text-foreground mt-1">{reply.content}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(reply.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                      
                      <div className="flex gap-2 pl-4">
                        <Input
                          placeholder="Write a reply..."
                          value={replyContent[discussion.id] || ""}
                          onChange={(e) => setReplyContent((prev) => ({ ...prev, [discussion.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleReply(discussion.id);
                            }
                          }}
                          className="bg-secondary border-border"
                        />
                        <Button
                          size="icon"
                          onClick={() => handleReply(discussion.id)}
                          className="bg-primary hover:bg-primary/90"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
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