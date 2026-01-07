import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, Plus, Search, Lock, Globe, Calendar, 
  UserPlus, Settings, Crown, Briefcase, TrendingUp, 
  Heart, Sparkles, Target
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MastermindGroup {
  id: string;
  name: string;
  description: string | null;
  creator_id: string;
  focus_area: string;
  max_members: number | null;
  meeting_frequency: string | null;
  is_private: boolean | null;
  created_at: string | null;
  member_count?: number;
  is_member?: boolean;
  creator?: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface GroupMember {
  user_id: string;
  role: string | null;
  status: string | null;
  profile?: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

const FOCUS_AREAS = [
  { value: "business", label: "Business", icon: Briefcase },
  { value: "finance", label: "Finance", icon: TrendingUp },
  { value: "career", label: "Career", icon: Target },
  { value: "health", label: "Health & Fitness", icon: Heart },
  { value: "personal", label: "Personal Growth", icon: Sparkles },
];

const Masterminds = () => {
  const [groups, setGroups] = useState<MastermindGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [focusFilter, setFocusFilter] = useState<string>("all");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [focusArea, setFocusArea] = useState("business");
  const [maxMembers, setMaxMembers] = useState("8");
  const [meetingFrequency, setMeetingFrequency] = useState("weekly");
  const [isPrivate, setIsPrivate] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchCurrentUser();
    fetchGroups();
  }, []);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const fetchGroups = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: groupsData, error } = await supabase
        .from("mastermind_groups")
        .select(`
          *,
          creator:profiles!mastermind_groups_creator_id_fkey(username, full_name, avatar_url)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get member counts and membership status
      const groupsWithCounts = await Promise.all(
        (groupsData || []).map(async (group) => {
          const { count } = await supabase
            .from("mastermind_members")
            .select("*", { count: "exact", head: true })
            .eq("group_id", group.id)
            .eq("status", "active");

          let isMember = false;
          if (user) {
            const { data: membership } = await supabase
              .from("mastermind_members")
              .select("user_id")
              .eq("group_id", group.id)
              .eq("user_id", user.id)
              .single();
            isMember = !!membership;
          }

          return {
            ...group,
            member_count: count || 0,
            is_member: isMember || group.creator_id === user?.id,
            creator: Array.isArray(group.creator) ? group.creator[0] : group.creator
          };
        })
      );

      setGroups(groupsWithCounts);
    } catch (error: any) {
      toast({
        title: "Error loading groups",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("mastermind_groups").insert({
        name,
        description,
        creator_id: user.id,
        focus_area: focusArea,
        max_members: parseInt(maxMembers),
        meeting_frequency: meetingFrequency,
        is_private: isPrivate,
      });

      if (error) throw error;

      toast({
        title: "Group created! 🎉",
        description: "Your mastermind group is ready.",
      });

      setName("");
      setDescription("");
      setFocusArea("business");
      setMaxMembers("8");
      setMeetingFrequency("weekly");
      setIsPrivate(false);
      setOpen(false);
      fetchGroups();
    } catch (error: any) {
      toast({
        title: "Error creating group",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const joinGroup = async (groupId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("mastermind_members").insert({
        group_id: groupId,
        user_id: user.id,
        status: "active",
      });

      if (error) throw error;

      toast({
        title: "Joined group! 🎉",
        description: "Welcome to the mastermind group.",
      });

      fetchGroups();
    } catch (error: any) {
      toast({
        title: "Error joining group",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getFocusIcon = (focus: string) => {
    const found = FOCUS_AREAS.find(f => f.value === focus);
    return found ? found.icon : Target;
  };

  const filteredGroups = groups.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFocus = focusFilter === "all" || group.focus_area === focusFilter;
    return matchesSearch && matchesFocus;
  });

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Mastermind Groups</h1>
            <p className="text-muted-foreground">Join forces with like-minded achievers</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-gold text-primary-foreground hover:opacity-90">
                <Plus className="mr-2 h-4 w-4" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-lg">
              <DialogHeader>
                <DialogTitle>Create a Mastermind Group</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="group-name">Group Name</Label>
                  <Input
                    id="group-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="e.g., Elite Entrepreneurs Circle"
                    className="bg-secondary border-border"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="group-description">Description</Label>
                  <Textarea
                    id="group-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="What is this group about?"
                    className="bg-secondary border-border"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Focus Area</Label>
                    <Select value={focusArea} onValueChange={setFocusArea}>
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FOCUS_AREAS.map(area => (
                          <SelectItem key={area.value} value={area.value}>
                            <div className="flex items-center gap-2">
                              <area.icon className="h-4 w-4" />
                              {area.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Max Members</Label>
                    <Select value={maxMembers} onValueChange={setMaxMembers}>
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4">4 members</SelectItem>
                        <SelectItem value="6">6 members</SelectItem>
                        <SelectItem value="8">8 members</SelectItem>
                        <SelectItem value="10">10 members</SelectItem>
                        <SelectItem value="12">12 members</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Meeting Frequency</Label>
                    <Select value={meetingFrequency} onValueChange={setMeetingFrequency}>
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="biweekly">Bi-weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Visibility</Label>
                    <Select value={isPrivate ? "private" : "public"} onValueChange={(v) => setIsPrivate(v === "private")}>
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            Public
                          </div>
                        </SelectItem>
                        <SelectItem value="private">
                          <div className="flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            Private
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Button type="submit" className="w-full bg-gradient-gold text-primary-foreground hover:opacity-90">
                  Create Group
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary border-border"
            />
          </div>
          <Select value={focusFilter} onValueChange={setFocusFilter}>
            <SelectTrigger className="w-full sm:w-48 bg-secondary border-border">
              <SelectValue placeholder="Focus Area" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Focus Areas</SelectItem>
              {FOCUS_AREAS.map(area => (
                <SelectItem key={area.value} value={area.value}>
                  <div className="flex items-center gap-2">
                    <area.icon className="h-4 w-4" />
                    {area.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Groups Grid */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading groups...</div>
        ) : filteredGroups.length === 0 ? (
          <Card className="p-12 text-center bg-card border-border">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No groups found</h3>
            <p className="text-muted-foreground mb-4">Be the first to create a mastermind group!</p>
            <Button onClick={() => setOpen(true)} className="bg-gradient-gold text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" />
              Create Group
            </Button>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredGroups.map((group) => {
              const FocusIcon = getFocusIcon(group.focus_area);
              const isFull = group.max_members ? (group.member_count || 0) >= group.max_members : false;
              
              return (
                <Card key={group.id} className="p-6 bg-card border-border hover:shadow-premium transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-gradient-gold flex items-center justify-center">
                        <FocusIcon className="h-6 w-6 text-primary-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{group.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {group.is_private ? (
                            <Lock className="h-3 w-3" />
                          ) : (
                            <Globe className="h-3 w-3" />
                          )}
                          <span>{group.is_private ? "Private" : "Public"}</span>
                        </div>
                      </div>
                    </div>
                    {group.creator_id === currentUserId && (
                      <Badge variant="secondary" className="text-xs">
                        <Crown className="h-3 w-3 mr-1" />
                        Creator
                      </Badge>
                    )}
                  </div>
                  
                  {group.description && (
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                      {group.description}
                    </p>
                  )}
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="outline">
                      <FocusIcon className="h-3 w-3 mr-1" />
                      {FOCUS_AREAS.find(f => f.value === group.focus_area)?.label}
                    </Badge>
                    <Badge variant="outline">
                      <Calendar className="h-3 w-3 mr-1" />
                      {group.meeting_frequency}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {group.creator && (
                          <Avatar className="h-8 w-8 border-2 border-background">
                            <AvatarImage src={group.creator.avatar_url || ""} />
                            <AvatarFallback className="text-xs">
                              {group.creator.username.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {group.member_count}/{group.max_members} members
                      </span>
                    </div>
                    
                    {group.is_member ? (
                      <Button size="sm" variant="outline" disabled>
                        Joined
                      </Button>
                    ) : isFull ? (
                      <Button size="sm" variant="outline" disabled>
                        Full
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        className="bg-primary hover:bg-primary/90"
                        onClick={() => joinGroup(group.id)}
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Join
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Masterminds;
