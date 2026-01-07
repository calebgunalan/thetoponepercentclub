import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Target, Plus, CheckCircle2, Circle, ListChecks, X, Users, Globe, Lock, ChevronDown, Flame, TrendingUp, Briefcase, Heart, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Goal {
  id: string;
  title: string;
  description: string | null;
  target_date: string | null;
  status: string;
  progress: number | null;
  visibility: string | null;
  category: string | null;
  priority: string | null;
  created_at: string;
}

interface ActionStep {
  id: string;
  goal_id: string;
  description: string;
  completed: boolean;
  created_at: string;
}

interface AccountabilityPartner {
  partner_id: string;
  status: string;
  profile?: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

const CATEGORIES = [
  { value: "general", label: "General", icon: Target },
  { value: "career", label: "Career", icon: Briefcase },
  { value: "finance", label: "Finance", icon: TrendingUp },
  { value: "health", label: "Health", icon: Heart },
  { value: "personal", label: "Personal Growth", icon: Sparkles },
];

const PRIORITIES = [
  { value: "low", label: "Low", color: "bg-muted" },
  { value: "medium", label: "Medium", color: "bg-primary/50" },
  { value: "high", label: "High", color: "bg-destructive/50" },
];

const Goals = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [actionSteps, setActionSteps] = useState<Record<string, ActionStep[]>>({});
  const [partners, setPartners] = useState<Record<string, AccountabilityPartner[]>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [partnerDialogOpen, setPartnerDialogOpen] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("medium");
  const [visibility, setVisibility] = useState("private");
  const [newStepDescription, setNewStepDescription] = useState<Record<string, string>>({});
  const [openGoals, setOpenGoals] = useState<Record<string, boolean>>({});
  const [members, setMembers] = useState<Profile[]>([]);
  const [searchMember, setSearchMember] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchGoals();
    fetchMembers();

    const goalsChannel = supabase
      .channel("goals-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "goals" }, () => {
        fetchGoals();
      })
      .subscribe();

    const stepsChannel = supabase
      .channel("steps-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "action_steps" }, (payload: any) => {
        if (payload.new?.goal_id) {
          fetchActionSteps(payload.new.goal_id);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(goalsChannel);
      supabase.removeChannel(stepsChannel);
    };
  }, []);

  const fetchMembers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .limit(100);
    if (data) setMembers(data);
  };

  const fetchGoals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setGoals(data || []);
      
      if (data) {
        data.forEach((goal) => {
          fetchActionSteps(goal.id);
          fetchPartners(goal.id);
        });
      }
    } catch (error: any) {
      toast({
        title: "Error loading goals",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchActionSteps = async (goalId: string) => {
    try {
      const { data, error } = await supabase
        .from("action_steps")
        .select("*")
        .eq("goal_id", goalId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setActionSteps((prev) => ({ ...prev, [goalId]: data || [] }));
    } catch (error: any) {
      console.error("Error loading action steps:", error);
    }
  };

  const fetchPartners = async (goalId: string) => {
    try {
      const { data, error } = await supabase
        .from("accountability_partners")
        .select(`
          partner_id,
          status,
          profile:profiles!accountability_partners_partner_id_fkey(username, full_name, avatar_url)
        `)
        .eq("goal_id", goalId);

      if (error) throw error;
      
      const formattedData = data?.map(item => ({
        partner_id: item.partner_id,
        status: item.status || 'pending',
        profile: Array.isArray(item.profile) ? item.profile[0] : item.profile
      })) || [];
      
      setPartners((prev) => ({ ...prev, [goalId]: formattedData }));
    } catch (error: any) {
      console.error("Error loading partners:", error);
    }
  };

  const addPartner = async (goalId: string, partnerId: string) => {
    try {
      const { error } = await supabase
        .from("accountability_partners")
        .insert({ goal_id: goalId, partner_id: partnerId });

      if (error) throw error;
      
      fetchPartners(goalId);
      setPartnerDialogOpen(null);
      setSearchMember("");
      
      toast({
        title: "Partner invited",
        description: "Accountability partner invitation sent.",
      });
    } catch (error: any) {
      toast({
        title: "Error adding partner",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const calculateProgress = (goalId: string): number => {
    const steps = actionSteps[goalId] || [];
    if (steps.length === 0) return 0;
    const completed = steps.filter(s => s.completed).length;
    return Math.round((completed / steps.length) * 100);
  };

  const addActionStep = async (goalId: string) => {
    const description = newStepDescription[goalId]?.trim();
    if (!description) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("action_steps").insert({
        goal_id: goalId,
        user_id: user.id,
        description,
      });

      if (error) throw error;

      setNewStepDescription((prev) => ({ ...prev, [goalId]: "" }));
      fetchActionSteps(goalId);
      
      toast({
        title: "Action step added",
        description: "Your action step has been created.",
      });
    } catch (error: any) {
      toast({
        title: "Error adding action step",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleActionStep = async (stepId: string, goalId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from("action_steps")
        .update({ completed: !completed })
        .eq("id", stepId);

      if (error) throw error;
      fetchActionSteps(goalId);
    } catch (error: any) {
      toast({
        title: "Error updating action step",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteActionStep = async (stepId: string, goalId: string) => {
    try {
      const { error } = await supabase
        .from("action_steps")
        .delete()
        .eq("id", stepId);

      if (error) throw error;
      fetchActionSteps(goalId);
      
      toast({
        title: "Action step deleted",
      });
    } catch (error: any) {
      toast({
        title: "Error deleting action step",
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

      const { error } = await supabase.from("goals").insert({
        user_id: user.id,
        title,
        description,
        target_date: targetDate || null,
        category,
        priority,
        visibility,
      });

      if (error) throw error;

      toast({
        title: "Goal created",
        description: "Your goal has been added successfully.",
      });

      setTitle("");
      setDescription("");
      setTargetDate("");
      setCategory("general");
      setPriority("medium");
      setVisibility("private");
      setOpen(false);
      fetchGoals();
    } catch (error: any) {
      toast({
        title: "Error creating goal",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleGoalStatus = async (goalId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "completed" ? "in_progress" : "completed";
      const { error } = await supabase
        .from("goals")
        .update({ status: newStatus })
        .eq("id", goalId);

      if (error) throw error;

      toast({
        title: newStatus === "completed" ? "Goal completed! 🎉" : "Goal reopened",
        description: newStatus === "completed" ? "Congratulations on your achievement!" : "Keep pushing forward!",
      });

      fetchGoals();
    } catch (error: any) {
      toast({
        title: "Error updating goal",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getCategoryIcon = (cat: string | null) => {
    const found = CATEGORIES.find(c => c.value === cat);
    return found ? found.icon : Target;
  };

  const filteredMembers = members.filter(m => 
    m.username.toLowerCase().includes(searchMember.toLowerCase()) ||
    m.full_name?.toLowerCase().includes(searchMember.toLowerCase())
  );

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading goals...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Goals & Action Steps</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-gold text-primary-foreground hover:opacity-90">
              <Plus className="mr-2 h-4 w-4" />
              New Goal
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-foreground">Create a Goal</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="goal-title">Goal</Label>
                <Input
                  id="goal-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="e.g., Launch new product"
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal-description">Description</Label>
                <Textarea
                  id="goal-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Optional details..."
                  className="bg-secondary border-border"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          <div className="flex items-center gap-2">
                            <cat.icon className="h-4 w-4" />
                            {cat.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map(p => (
                        <SelectItem key={p.value} value={p.value}>
                          <div className="flex items-center gap-2">
                            <Flame className={`h-4 w-4 ${p.value === 'high' ? 'text-destructive' : p.value === 'medium' ? 'text-primary' : 'text-muted-foreground'}`} />
                            {p.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="target-date">Target Date</Label>
                  <Input
                    id="target-date"
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="bg-secondary border-border"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Visibility</Label>
                  <Select value={visibility} onValueChange={setVisibility}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">
                        <div className="flex items-center gap-2">
                          <Lock className="h-4 w-4" />
                          Private
                        </div>
                      </SelectItem>
                      <SelectItem value="partners">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Partners Only
                        </div>
                      </SelectItem>
                      <SelectItem value="public">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Public
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button type="submit" className="w-full bg-gradient-gold text-primary-foreground hover:opacity-90">
                Create Goal
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {goals.length === 0 ? (
          <Card className="p-8 text-center bg-card border-border">
            <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No goals yet. Set your first goal!</p>
          </Card>
        ) : (
          goals.map((goal) => {
            const CategoryIcon = getCategoryIcon(goal.category);
            const progress = calculateProgress(goal.id);
            const goalPartners = partners[goal.id] || [];
            
            return (
              <Card key={goal.id} className="p-6 bg-card border-border hover:shadow-premium transition-shadow">
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => toggleGoalStatus(goal.id, goal.status)}
                    className="flex-shrink-0 mt-1"
                  >
                    {goal.status === "completed" ? (
                      <CheckCircle2 className="h-6 w-6 text-primary" />
                    ) : (
                      <Circle className="h-6 w-6 text-muted-foreground hover:text-primary transition-colors" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className={`text-lg font-semibold ${goal.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {goal.title}
                      </h3>
                      <Badge variant="outline" className="text-xs">
                        <CategoryIcon className="h-3 w-3 mr-1" />
                        {CATEGORIES.find(c => c.value === goal.category)?.label || "General"}
                      </Badge>
                      {goal.priority === "high" && (
                        <Badge variant="destructive" className="text-xs">
                          <Flame className="h-3 w-3 mr-1" />
                          High Priority
                        </Badge>
                      )}
                      {goal.visibility === "public" && (
                        <Badge variant="secondary" className="text-xs">
                          <Globe className="h-3 w-3 mr-1" />
                          Public
                        </Badge>
                      )}
                    </div>
                    
                    {goal.description && (
                      <p className="text-foreground mb-2">{goal.description}</p>
                    )}
                    
                    {/* Progress bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-sm text-muted-foreground mb-1">
                        <span>Progress</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      {goal.target_date && (
                        <span>Target: {new Date(goal.target_date).toLocaleDateString()}</span>
                      )}
                    </div>

                    {/* Accountability Partners */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm text-muted-foreground">Partners:</span>
                      <div className="flex -space-x-2">
                        {goalPartners.slice(0, 3).map((p) => (
                          <Avatar key={p.partner_id} className="h-6 w-6 border-2 border-background">
                            <AvatarImage src={p.profile?.avatar_url || ""} />
                            <AvatarFallback className="text-xs">
                              {p.profile?.username?.charAt(0).toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {goalPartners.length > 3 && (
                          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs border-2 border-background">
                            +{goalPartners.length - 3}
                          </div>
                        )}
                      </div>
                      <Dialog open={partnerDialogOpen === goal.id} onOpenChange={(open) => setPartnerDialogOpen(open ? goal.id : null)}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 px-2">
                            <Plus className="h-3 w-3 mr-1" />
                            Add
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-card border-border">
                          <DialogHeader>
                            <DialogTitle>Add Accountability Partner</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Input
                              placeholder="Search members..."
                              value={searchMember}
                              onChange={(e) => setSearchMember(e.target.value)}
                              className="bg-secondary border-border"
                            />
                            <div className="max-h-60 overflow-y-auto space-y-2">
                              {filteredMembers.slice(0, 10).map((member) => (
                                <div
                                  key={member.id}
                                  className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary cursor-pointer"
                                  onClick={() => addPartner(goal.id, member.id)}
                                >
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage src={member.avatar_url || ""} />
                                      <AvatarFallback>{member.username.charAt(0).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="text-sm font-medium">{member.full_name || member.username}</p>
                                      <p className="text-xs text-muted-foreground">@{member.username}</p>
                                    </div>
                                  </div>
                                  <Button size="sm" variant="outline">Invite</Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    <Collapsible
                      open={openGoals[goal.id]}
                      onOpenChange={(open) => setOpenGoals((prev) => ({ ...prev, [goal.id]: open }))}
                    >
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-2">
                          <ListChecks className="h-4 w-4" />
                          Action Steps ({actionSteps[goal.id]?.filter(s => s.completed).length || 0}/{actionSteps[goal.id]?.length || 0})
                          <ChevronDown className={`h-4 w-4 transition-transform ${openGoals[goal.id] ? "rotate-180" : ""}`} />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-4 space-y-3">
                        {actionSteps[goal.id]?.map((step) => (
                          <div key={step.id} className="flex items-start gap-3 pl-4 border-l-2 border-primary/20">
                            <button
                              onClick={() => toggleActionStep(step.id, goal.id, step.completed)}
                              className="flex-shrink-0 mt-0.5"
                            >
                              {step.completed ? (
                                <CheckCircle2 className="h-5 w-5 text-primary" />
                              ) : (
                                <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                              )}
                            </button>
                            <p className={`flex-1 text-sm ${step.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                              {step.description}
                            </p>
                            <button
                              onClick={() => deleteActionStep(step.id, goal.id)}
                              className="flex-shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        
                        <div className="flex gap-2 pl-4 mt-3">
                          <Input
                            placeholder="Add action step..."
                            value={newStepDescription[goal.id] || ""}
                            onChange={(e) => setNewStepDescription((prev) => ({ ...prev, [goal.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addActionStep(goal.id);
                              }
                            }}
                            className="bg-secondary border-border text-sm"
                          />
                          <Button
                            size="sm"
                            onClick={() => addActionStep(goal.id)}
                            className="bg-primary hover:bg-primary/90"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Goals;
