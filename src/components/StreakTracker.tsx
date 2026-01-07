import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Flame, Calendar, Trophy } from "lucide-react";
import { motion } from "framer-motion";

interface StreakData {
  current_streak: number | null;
  longest_streak: number | null;
  last_activity_date: string | null;
}

interface StreakTrackerProps {
  compact?: boolean;
}

const StreakTracker = ({ compact = false }: StreakTrackerProps) => {
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStreak();
  }, []);

  const fetchStreak = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_streaks")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setStreak(data);
        // Check if we need to update streak
        await updateStreakIfNeeded(user.id, data);
      } else {
        // Create initial streak record
        await supabase.from("user_streaks").insert({
          user_id: user.id,
          current_streak: 1,
          longest_streak: 1,
          last_activity_date: new Date().toISOString().split("T")[0],
        });
        setStreak({ current_streak: 1, longest_streak: 1, last_activity_date: new Date().toISOString().split("T")[0] });
      }
    } catch (error) {
      console.error("Error fetching streak:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStreakIfNeeded = async (userId: string, currentStreak: StreakData) => {
    const today = new Date().toISOString().split("T")[0];
    const lastActivity = currentStreak.last_activity_date;

    if (lastActivity === today) return; // Already logged today

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    let newStreak = 1;
    if (lastActivity === yesterdayStr) {
      // Continue streak
      newStreak = (currentStreak.current_streak || 0) + 1;
    }

    const newLongest = Math.max(newStreak, currentStreak.longest_streak || 0);

    await supabase.from("user_streaks").update({
      current_streak: newStreak,
      longest_streak: newLongest,
      last_activity_date: today,
    }).eq("user_id", userId);

    setStreak({
      current_streak: newStreak,
      longest_streak: newLongest,
      last_activity_date: today,
    });
  };

  if (loading) {
    return null;
  }

  const currentStreak = streak?.current_streak || 0;
  const longestStreak = streak?.longest_streak || 0;

  if (compact) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-full border border-orange-500/30"
      >
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
          }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <Flame className="h-4 w-4 text-orange-500" />
        </motion.div>
        <span className="text-sm font-semibold text-orange-500">{currentStreak} day streak</span>
      </motion.div>
    );
  }

  return (
    <Card className="p-6 bg-card border-border">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Flame className="h-5 w-5 text-orange-500" />
        Activity Streak
      </h3>
      
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-center p-4 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30"
        >
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="inline-block"
          >
            <Flame className="h-8 w-8 text-orange-500 mx-auto mb-2" />
          </motion.div>
          <p className="text-3xl font-bold text-orange-500">{currentStreak}</p>
          <p className="text-sm text-muted-foreground">Current Streak</p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-center p-4 rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-500/30"
        >
          <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
          <p className="text-3xl font-bold text-yellow-500">{longestStreak}</p>
          <p className="text-sm text-muted-foreground">Best Streak</p>
        </motion.div>
      </div>
      
      <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="h-4 w-4" />
        <span>
          {streak?.last_activity_date 
            ? `Last active: ${new Date(streak.last_activity_date).toLocaleDateString()}`
            : "Start your streak today!"}
        </span>
      </div>
    </Card>
  );
};

export default StreakTracker;
