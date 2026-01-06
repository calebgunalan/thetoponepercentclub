import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Users, Crown, Award, TrendingUp } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Member {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  member_tier: string;
  expertise: string[];
  achievements_count: number;
  goals_completed: number;
  joined_at: string;
}

const tierColors: Record<string, string> = {
  rising: "bg-secondary text-secondary-foreground",
  established: "bg-blue-500/20 text-blue-400",
  elite: "bg-purple-500/20 text-purple-400",
  legend: "bg-gradient-gold text-primary-foreground",
};

const tierIcons: Record<string, any> = {
  rising: TrendingUp,
  established: Award,
  elite: Crown,
  legend: Crown,
};

const Members = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("joined_at", { ascending: false });

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      member.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.bio?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTier = tierFilter === "all" || member.member_tier === tierFilter;
    
    return matchesSearch && matchesTier;
  });

  const getInitials = (member: Member) => {
    if (member.full_name) {
      return member.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return member.username.slice(0, 2).toUpperCase();
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Member Directory</h1>
          <p className="text-muted-foreground">
            Connect with {members.length} elite achievers in the community
          </p>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6 bg-card border-border">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, username, or bio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-secondary border-border"
              />
            </div>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-full md:w-48 bg-secondary border-border">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="rising">Rising</SelectItem>
                <SelectItem value="established">Established</SelectItem>
                <SelectItem value="elite">Elite</SelectItem>
                <SelectItem value="legend">Legend</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Members Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="p-6 bg-card border-border animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-secondary" />
                  <div className="flex-1">
                    <div className="h-4 bg-secondary rounded w-24 mb-2" />
                    <div className="h-3 bg-secondary rounded w-16" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMembers.map((member) => {
              const TierIcon = tierIcons[member.member_tier] || TrendingUp;
              return (
                <Card
                  key={member.id}
                  className="p-6 bg-card border-border hover:shadow-premium transition-all hover:border-primary/30"
                >
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16 border-2 border-border">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                        {getInitials(member)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">
                          {member.full_name || member.username}
                        </h3>
                        <Badge className={tierColors[member.member_tier]}>
                          <TierIcon className="h-3 w-3 mr-1" />
                          {member.member_tier}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        @{member.username}
                      </p>
                      {member.bio && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {member.bio}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Award className="h-3 w-3" />
                          {member.achievements_count} achievements
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {member.goals_completed} goals
                        </span>
                      </div>
                    </div>
                  </div>
                  {member.expertise && member.expertise.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {member.expertise.slice(0, 3).map((skill, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="text-xs border-border"
                        >
                          {skill}
                        </Badge>
                      ))}
                      {member.expertise.length > 3 && (
                        <Badge variant="outline" className="text-xs border-border">
                          +{member.expertise.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-border hover:bg-secondary"
                    >
                      View Profile
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      Message
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {!loading && filteredMembers.length === 0 && (
          <Card className="p-12 text-center bg-card border-border">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No members found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filter criteria
            </p>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Members;
