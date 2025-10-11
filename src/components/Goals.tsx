import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Target, Plus, CheckCircle2, Circle, ListChecks, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Goal {
  id: string;
  title: string;
  description: string | null;
  target_date: string | null;
  status: string;
  created_at: string;
}

interface ActionStep {
  id: string;
  goal_id: string;
  description: string;
  completed: boolean;
  created_at: string;
}

const Goals = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [actionSteps, setActionSteps] = useState<Record<string, ActionStep[]>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [newStepDescription, setNewStepDescription] = useState<Record<string, string>>({});
  const [openGoals, setOpenGoals] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchGoals();

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
        data.forEach((goal) => fetchActionSteps(goal.id));
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
      });

      if (error) throw error;

      toast({
        title: "Goal created",
        description: "Your goal has been added successfully.",
      });

      setTitle("");
      setDescription("");
      setTargetDate("");
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
        title: newStatus === "completed" ? "Goal completed!" : "Goal reopened",
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
          <DialogContent className="bg-card border-border">
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
          goals.map((goal) => (
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
                <div className="flex-1">
                  <h3 className={`text-lg font-semibold mb-2 ${goal.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {goal.title}
                  </h3>
                  {goal.description && (
                    <p className="text-foreground mb-2">{goal.description}</p>
                  )}
                  {goal.target_date && (
                    <p className="text-sm text-muted-foreground mb-3">
                      Target: {new Date(goal.target_date).toLocaleDateString()}
                    </p>
                  )}

                  <Collapsible
                    open={openGoals[goal.id]}
                    onOpenChange={(open) => setOpenGoals((prev) => ({ ...prev, [goal.id]: open }))}
                  >
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-2">
                        <ListChecks className="h-4 w-4" />
                        Action Steps ({actionSteps[goal.id]?.filter(s => s.completed).length || 0}/{actionSteps[goal.id]?.length || 0})
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
          ))
        )}
      </div>
    </div>
  );
};

export default Goals;