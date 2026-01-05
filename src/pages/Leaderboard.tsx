import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Crown, Trophy, TrendingUp, Flame, Medal } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
  user_id: string;
  total_points: number;
  weekly_points: number;
  monthly_points: number;
  profiles?: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    member_tier: string;
  };
}

const Leaderboard = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from("user_points")
        .select("*")
        .order("total_points", { ascending: false })
        .limit(100);

      if (error) throw error;
      
      // Fetch profiles separately
      const userIds = data?.map(d => d.user_id) || [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, member_tier")
        .in("id", userIds);
      
      const entriesWithProfiles = (data || []).map(entry => ({
        ...entry,
        profiles: profiles?.find(p => p.id === entry.user_id) as any
      }));
      
      setEntries(entriesWithProfiles);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-400" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Medal className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getRankBg = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/30";
      case 2:
        return "bg-gradient-to-r from-gray-400/10 to-gray-500/10 border-gray-400/30";
      case 3:
        return "bg-gradient-to-r from-amber-600/10 to-orange-600/10 border-amber-600/30";
      default:
        return "";
    }
  };

  const getInitials = (entry: LeaderboardEntry) => {
    if (entry.profiles?.full_name) {
      return entry.profiles.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return entry.profiles?.username?.slice(0, 2).toUpperCase() || "??";
  };

  const LeaderboardList = ({ sortKey }: { sortKey: "total_points" | "weekly_points" | "monthly_points" }) => {
    const sortedEntries = [...entries].sort((a, b) => b[sortKey] - a[sortKey]);

    if (loading) {
      return (
        <div className="space-y-4">
          {[...Array(10)].map((_, i) => (
            <Card key={i} className="p-4 bg-card border-border animate-pulse">
              <div className="flex items-center gap-4">
                <div className="h-8 w-8 rounded-full bg-secondary" />
                <div className="h-12 w-12 rounded-full bg-secondary" />
                <div className="flex-1">
                  <div className="h-4 bg-secondary rounded w-32 mb-2" />
                  <div className="h-3 bg-secondary rounded w-20" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      );
    }

    if (sortedEntries.length === 0) {
      return (
        <Card className="p-12 text-center bg-card border-border">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No rankings yet</h3>
          <p className="text-muted-foreground">
            Start earning points by completing goals and engaging with the community!
          </p>
        </Card>
      );
    }

    return (
      <div className="space-y-3">
        {sortedEntries.map((entry, index) => {
          const rank = index + 1;
          const isCurrentUser = entry.user_id === currentUserId;

          return (
            <Card
              key={entry.user_id}
              className={cn(
                "p-4 bg-card border-border transition-all hover:border-primary/30",
                getRankBg(rank),
                isCurrentUser && "ring-2 ring-primary"
              )}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 flex items-center justify-center">
                  {getRankIcon(rank)}
                </div>

                <Avatar className="h-12 w-12 border-2 border-border">
                  <AvatarImage src={entry.profiles?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getInitials(entry)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">
                      {entry.profiles?.full_name || entry.profiles?.username}
                    </h3>
                    {isCurrentUser && (
                      <Badge className="bg-primary text-primary-foreground text-xs">You</Badge>
                    )}
                    {rank <= 3 && (
                      <Badge
                        className={cn(
                          "text-xs",
                          rank === 1 && "bg-yellow-500/20 text-yellow-400",
                          rank === 2 && "bg-gray-400/20 text-gray-300",
                          rank === 3 && "bg-amber-600/20 text-amber-500"
                        )}
                      >
                        {rank === 1 ? "🥇 Champion" : rank === 2 ? "🥈 Runner-up" : "🥉 Third"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    @{entry.profiles?.username}
                  </p>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-1 text-primary font-bold text-xl">
                    <Flame className="h-5 w-5" />
                    {entry[sortKey].toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">points</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-xl bg-gradient-gold flex items-center justify-center">
              <Trophy className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Leaderboard</h1>
              <p className="text-muted-foreground">
                See who's leading the charge in the Top 1% Club
              </p>
            </div>
          </div>
        </div>

        {/* Top 3 Podium */}
        {!loading && entries.length >= 3 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[1, 0, 2].map((podiumIndex) => {
              const entry = entries[podiumIndex];
              if (!entry) return null;
              const rank = podiumIndex + 1;
              const actualRank = podiumIndex === 0 ? 2 : podiumIndex === 1 ? 1 : 3;

              return (
                <Card
                  key={entry.user_id}
                  className={cn(
                    "p-6 text-center bg-card border-border",
                    actualRank === 1 && "md:scale-110 bg-gradient-to-b from-yellow-500/10 to-transparent border-yellow-500/30",
                    actualRank === 2 && "bg-gradient-to-b from-gray-400/10 to-transparent",
                    actualRank === 3 && "bg-gradient-to-b from-amber-600/10 to-transparent"
                  )}
                >
                  <div className="mb-4">
                    {getRankIcon(actualRank)}
                  </div>
                  <Avatar className="h-16 w-16 mx-auto mb-3 border-2 border-border">
                    <AvatarImage src={entry.profiles?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                      {getInitials(entry)}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold truncate mb-1">
                    {entry.profiles?.full_name || entry.profiles?.username}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    @{entry.profiles?.username}
                  </p>
                  <div className="flex items-center justify-center gap-1 text-primary font-bold">
                    <Flame className="h-4 w-4" />
                    {entry.total_points.toLocaleString()}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Full Rankings */}
        <Tabs defaultValue="all-time" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 bg-card">
            <TabsTrigger
              value="all-time"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Trophy className="h-4 w-4 mr-2" />
              All Time
            </TabsTrigger>
            <TabsTrigger
              value="monthly"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              This Month
            </TabsTrigger>
            <TabsTrigger
              value="weekly"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Flame className="h-4 w-4 mr-2" />
              This Week
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all-time">
            <LeaderboardList sortKey="total_points" />
          </TabsContent>
          <TabsContent value="monthly">
            <LeaderboardList sortKey="monthly_points" />
          </TabsContent>
          <TabsContent value="weekly">
            <LeaderboardList sortKey="weekly_points" />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Leaderboard;
