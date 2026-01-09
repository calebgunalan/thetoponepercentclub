import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StreakTracker from "@/components/StreakTracker";
import BadgeDisplay from "@/components/BadgeDisplay";
import { 
  Target, Trophy, Flame, TrendingUp, 
  CheckCircle2, Calendar, Award, Zap
} from "lucide-react";
import { motion } from "framer-motion";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell
} from "recharts";

interface Stats {
  totalGoals: number;
  completedGoals: number;
  totalAchievements: number;
  totalPoints: number;
  discussionsCreated: number;
  meetingsAttended: number;
}

interface PointTransaction {
  points: number;
  action_type: string;
  created_at: string;
}

const MyProgress = () => {
  const [stats, setStats] = useState<Stats>({
    totalGoals: 0,
    completedGoals: 0,
    totalAchievements: 0,
    totalPoints: 0,
    discussionsCreated: 0,
    meetingsAttended: 0,
  });
  const [pointsHistory, setPointsHistory] = useState<{ date: string; points: number }[]>([]);
  const [goalsByCategory, setGoalsByCategory] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch goals stats
      const { data: goals } = await supabase
        .from("goals")
        .select("status, category")
        .eq("user_id", user.id);

      const totalGoals = goals?.length || 0;
      const completedGoals = goals?.filter(g => g.status === "completed").length || 0;

      // Goals by category
      const categoryMap: Record<string, number> = {};
      goals?.forEach(g => {
        const cat = g.category || "general";
        categoryMap[cat] = (categoryMap[cat] || 0) + 1;
      });
      setGoalsByCategory(Object.entries(categoryMap).map(([name, value]) => ({ name, value })));

      // Fetch achievements count
      const { count: achievementsCount } = await supabase
        .from("achievements")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      // Fetch discussions count
      const { count: discussionsCount } = await supabase
        .from("discussions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      // Fetch meetings attended
      const { count: meetingsCount } = await supabase
        .from("meeting_attendees")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      // Fetch points
      const { data: pointsData } = await supabase
        .from("user_points")
        .select("total_points")
        .eq("user_id", user.id)
        .single();

      // Fetch point transactions for chart
      const { data: transactions } = await supabase
        .from("point_transactions")
        .select("points, action_type, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(30);

      // Group transactions by date
      const pointsByDate: Record<string, number> = {};
      let runningTotal = 0;
      transactions?.forEach(t => {
        const date = new Date(t.created_at || "").toLocaleDateString("en-US", { month: "short", day: "numeric" });
        runningTotal += t.points;
        pointsByDate[date] = runningTotal;
      });
      setPointsHistory(Object.entries(pointsByDate).map(([date, points]) => ({ date, points })));

      setStats({
        totalGoals,
        completedGoals,
        totalAchievements: achievementsCount || 0,
        totalPoints: pointsData?.total_points || 0,
        discussionsCreated: discussionsCount || 0,
        meetingsAttended: meetingsCount || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const goalCompletionRate = stats.totalGoals > 0 
    ? Math.round((stats.completedGoals / stats.totalGoals) * 100) 
    : 0;

  const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-muted-foreground">Loading your progress...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Progress</h1>
          <p className="text-muted-foreground">Track your journey to the top 1%</p>
        </div>

        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
        >
          <Card className="p-4 text-center bg-card border-border">
            <Target className="h-6 w-6 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{stats.totalGoals}</p>
            <p className="text-xs text-muted-foreground">Total Goals</p>
          </Card>
          <Card className="p-4 text-center bg-card border-border">
            <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{stats.completedGoals}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </Card>
          <Card className="p-4 text-center bg-card border-border">
            <Trophy className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
            <p className="text-2xl font-bold">{stats.totalAchievements}</p>
            <p className="text-xs text-muted-foreground">Achievements</p>
          </Card>
          <Card className="p-4 text-center bg-card border-border">
            <Zap className="h-6 w-6 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold">{stats.totalPoints}</p>
            <p className="text-xs text-muted-foreground">Points</p>
          </Card>
          <Card className="p-4 text-center bg-card border-border">
            <Award className="h-6 w-6 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{stats.discussionsCreated}</p>
            <p className="text-xs text-muted-foreground">Discussions</p>
          </Card>
          <Card className="p-4 text-center bg-card border-border">
            <Calendar className="h-6 w-6 mx-auto mb-2 text-orange-500" />
            <p className="text-2xl font-bold">{stats.meetingsAttended}</p>
            <p className="text-xs text-muted-foreground">Meetings</p>
          </Card>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Charts */}
          <div className="lg:col-span-2 space-y-6">
            {/* Goal Completion */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="p-6 bg-card border-border">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Goal Completion Rate
                </h3>
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-1">
                    <Progress value={goalCompletionRate} className="h-4" />
                  </div>
                  <span className="text-2xl font-bold text-primary">{goalCompletionRate}%</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  You've completed {stats.completedGoals} out of {stats.totalGoals} goals
                </p>
              </Card>
            </motion.div>

            {/* Points Over Time */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="p-6 bg-card border-border">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Points Growth
                </h3>
                {pointsHistory.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={pointsHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="date" 
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                        />
                        <YAxis 
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px"
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="points" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          dot={{ fill: "hsl(var(--primary))" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    Complete activities to start earning points!
                  </div>
                )}
              </Card>
            </motion.div>

            {/* Goals by Category */}
            {goalsByCategory.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="p-6 bg-card border-border">
                  <h3 className="text-lg font-semibold mb-4">Goals by Category</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={goalsByCategory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="name" 
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                        />
                        <YAxis 
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px"
                          }}
                        />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <StreakTracker />
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="p-6 bg-card border-border">
                <BadgeDisplay showAll />
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MyProgress;
