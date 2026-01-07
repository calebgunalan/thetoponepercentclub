import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, Target, MessageSquare, Users, Flame, 
  Star, Zap, Award, Crown, Shield, Heart, 
  BookOpen, Rocket, Medal
} from "lucide-react";
import { motion } from "framer-motion";

interface BadgeData {
  id: string;
  name: string;
  description: string | null;
  icon_name: string;
  category: string;
  requirement_type: string;
  requirement_value: number;
}

interface UserBadge {
  badge_id: string;
  earned_at: string | null;
  badge?: BadgeData;
}

const ICON_MAP: Record<string, any> = {
  trophy: Trophy,
  target: Target,
  message: MessageSquare,
  users: Users,
  flame: Flame,
  star: Star,
  zap: Zap,
  award: Award,
  crown: Crown,
  shield: Shield,
  heart: Heart,
  book: BookOpen,
  rocket: Rocket,
  medal: Medal,
};

const CATEGORY_COLORS: Record<string, string> = {
  goals: "from-green-500 to-emerald-600",
  social: "from-blue-500 to-cyan-600",
  engagement: "from-purple-500 to-pink-600",
  streaks: "from-orange-500 to-red-600",
  achievements: "from-yellow-500 to-amber-600",
};

interface BadgeDisplayProps {
  userId?: string;
  showAll?: boolean;
  compact?: boolean;
}

const BadgeDisplay = ({ userId, showAll = false, compact = false }: BadgeDisplayProps) => {
  const [allBadges, setAllBadges] = useState<BadgeData[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBadges();
  }, [userId]);

  const fetchBadges = async () => {
    try {
      const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
      if (!targetUserId) return;

      // Fetch all badges
      const { data: badges } = await supabase
        .from("badges")
        .select("*")
        .order("requirement_value", { ascending: true });

      // Fetch user's earned badges
      const { data: earned } = await supabase
        .from("user_badges")
        .select(`
          badge_id,
          earned_at,
          badge:badges(*)
        `)
        .eq("user_id", targetUserId);

      setAllBadges(badges || []);
      
      const formattedEarned = earned?.map(e => ({
        badge_id: e.badge_id,
        earned_at: e.earned_at,
        badge: Array.isArray(e.badge) ? e.badge[0] : e.badge
      })) || [];
      
      setUserBadges(formattedEarned);
    } catch (error) {
      console.error("Error fetching badges:", error);
    } finally {
      setLoading(false);
    }
  };

  const earnedBadgeIds = new Set(userBadges.map(ub => ub.badge_id));

  const getIcon = (iconName: string) => {
    return ICON_MAP[iconName] || Award;
  };

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading badges...</div>;
  }

  const displayBadges = showAll ? allBadges : allBadges.filter(b => earnedBadgeIds.has(b.id));

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {userBadges.slice(0, 5).map((ub, index) => {
          const badge = ub.badge;
          if (!badge) return null;
          const Icon = getIcon(badge.icon_name);
          const colorClass = CATEGORY_COLORS[badge.category] || "from-gray-500 to-gray-600";
          
          return (
            <motion.div
              key={ub.badge_id}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: index * 0.1, type: "spring" }}
              className={`h-8 w-8 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center shadow-lg`}
              title={badge.name}
            >
              <Icon className="h-4 w-4 text-white" />
            </motion.div>
          );
        })}
        {userBadges.length > 5 && (
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
            +{userBadges.length - 5}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">Badges & Achievements</h3>
      
      {displayBadges.length === 0 ? (
        <Card className="p-8 text-center bg-card border-border">
          <Trophy className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {showAll ? "No badges available yet." : "No badges earned yet. Keep achieving!"}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(showAll ? allBadges : displayBadges).map((badge, index) => {
            const Icon = getIcon(badge.icon_name);
            const isEarned = earnedBadgeIds.has(badge.id);
            const colorClass = CATEGORY_COLORS[badge.category] || "from-gray-500 to-gray-600";
            const earnedData = userBadges.find(ub => ub.badge_id === badge.id);
            
            return (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className={`p-4 bg-card border-border transition-all ${
                    isEarned 
                      ? "hover:shadow-premium" 
                      : "opacity-50 grayscale"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div 
                      className={`h-14 w-14 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center shadow-lg flex-shrink-0`}
                    >
                      <Icon className="h-7 w-7 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold truncate">{badge.name}</h4>
                        {isEarned && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            Earned
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {badge.description}
                      </p>
                      {isEarned && earnedData?.earned_at && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Earned on {new Date(earnedData.earned_at).toLocaleDateString()}
                        </p>
                      )}
                      {!isEarned && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Requirement: {badge.requirement_value} {badge.requirement_type}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BadgeDisplay;
