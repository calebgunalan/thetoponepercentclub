import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LogOut, Users, Target, Trophy, Calendar } from "lucide-react";
import Discussions from "@/components/Discussions";
import Achievements from "@/components/Achievements";
import Goals from "@/components/Goals";
import Meetings from "@/components/Meetings";

const Dashboard = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-gold bg-clip-text text-transparent">
            The Top 1% Club
          </h1>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="border-primary text-foreground hover:bg-primary/10"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="discussions" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8 bg-card">
            <TabsTrigger value="discussions" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="mr-2 h-4 w-4" />
              Discussions
            </TabsTrigger>
            <TabsTrigger value="achievements" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Trophy className="mr-2 h-4 w-4" />
              Achievements
            </TabsTrigger>
            <TabsTrigger value="goals" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Target className="mr-2 h-4 w-4" />
              Goals
            </TabsTrigger>
            <TabsTrigger value="meetings" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Calendar className="mr-2 h-4 w-4" />
              Meetings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="discussions">
            <Discussions />
          </TabsContent>

          <TabsContent value="achievements">
            <Achievements />
          </TabsContent>

          <TabsContent value="goals">
            <Goals />
          </TabsContent>

          <TabsContent value="meetings">
            <Meetings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;