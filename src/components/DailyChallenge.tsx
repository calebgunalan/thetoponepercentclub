import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Zap, CheckCircle2, Clock, Gift } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Challenge {
  id: string;
  title: string;
  description: string | null;
  points_reward: number | null;
  challenge_type: string;
  active_date: string;
}

const DailyChallenge = () => {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTodaysChallenge();
  }, []);

  const fetchTodaysChallenge = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get today's challenge
      const { data: challengeData, error } = await supabase
        .from("daily_challenges")
        .select("*")
        .eq("active_date", today)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (challengeData) {
        setChallenge(challengeData);
        
        // Check if user already completed it
        if (user) {
          const { data: completion } = await supabase
            .from("user_challenge_completions")
            .select("*")
            .eq("user_id", user.id)
            .eq("challenge_id", challengeData.id)
            .single();
          
          setCompleted(!!completion);
        }
      }
    } catch (error) {
      console.error("Error fetching challenge:", error);
    } finally {
      setLoading(false);
    }
  };

  const completeChallenge = async () => {
    if (!challenge) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Record completion
      const { error: completionError } = await supabase
        .from("user_challenge_completions")
        .insert({
          user_id: user.id,
          challenge_id: challenge.id,
        });

      if (completionError) throw completionError;

      // Award points
      if (challenge.points_reward) {
        // Update user_points
        const { data: currentPoints } = await supabase
          .from("user_points")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (currentPoints) {
          await supabase.from("user_points").update({
            total_points: (currentPoints.total_points || 0) + challenge.points_reward,
            weekly_points: (currentPoints.weekly_points || 0) + challenge.points_reward,
            monthly_points: (currentPoints.monthly_points || 0) + challenge.points_reward,
          }).eq("user_id", user.id);
        } else {
          await supabase.from("user_points").insert({
            user_id: user.id,
            total_points: challenge.points_reward,
            weekly_points: challenge.points_reward,
            monthly_points: challenge.points_reward,
          });
        }

        // Record transaction
        await supabase.from("point_transactions").insert({
          user_id: user.id,
          points: challenge.points_reward,
          action_type: "daily_challenge",
          description: `Completed: ${challenge.title}`,
        });
      }

      setCompleted(true);
      
      toast({
        title: "Challenge Complete! 🎉",
        description: `You earned ${challenge.points_reward} points!`,
      });
    } catch (error: any) {
      toast({
        title: "Error completing challenge",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return null;
  }

  if (!challenge) {
    return (
      <Card className="p-6 bg-card border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold">Daily Challenge</h3>
            <p className="text-sm text-muted-foreground">No challenge today</p>
          </div>
        </div>
        <p className="text-muted-foreground text-sm">Check back tomorrow for a new challenge!</p>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className={`p-6 border-border transition-all ${
        completed 
          ? "bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30" 
          : "bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30"
      }`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <motion.div 
              className={`h-10 w-10 rounded-full flex items-center justify-center ${
                completed 
                  ? "bg-gradient-to-br from-green-500 to-emerald-600" 
                  : "bg-gradient-to-br from-purple-500 to-pink-500"
              }`}
              animate={completed ? {} : { 
                scale: [1, 1.1, 1],
              }}
              transition={{ 
                duration: 2, 
                repeat: completed ? 0 : Infinity,
                ease: "easeInOut"
              }}
            >
              {completed ? (
                <CheckCircle2 className="h-5 w-5 text-white" />
              ) : (
                <Zap className="h-5 w-5 text-white" />
              )}
            </motion.div>
            <div>
              <h3 className="font-semibold">Daily Challenge</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Resets at midnight</span>
              </div>
            </div>
          </div>
          <Badge variant="secondary" className="bg-primary/20 text-primary">
            <Gift className="h-3 w-3 mr-1" />
            +{challenge.points_reward} pts
          </Badge>
        </div>
        
        <div className="mb-4">
          <h4 className="font-medium mb-1">{challenge.title}</h4>
          {challenge.description && (
            <p className="text-sm text-muted-foreground">{challenge.description}</p>
          )}
        </div>
        
        <AnimatePresence mode="wait">
          {completed ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 text-green-500"
            >
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Challenge Completed!</span>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Button 
                onClick={completeChallenge}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
              >
                <Zap className="h-4 w-4 mr-2" />
                Complete Challenge
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

export default DailyChallenge;
