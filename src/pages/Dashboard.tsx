import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Target, Trophy, Calendar } from "lucide-react";
import Layout from "@/components/Layout";
import Discussions from "@/components/Discussions";
import Achievements from "@/components/Achievements";
import Goals from "@/components/Goals";
import Meetings from "@/components/Meetings";
import StreakTracker from "@/components/StreakTracker";
import DailyChallenge from "@/components/DailyChallenge";
import BadgeDisplay from "@/components/BadgeDisplay";

const Dashboard = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content */}
          <div className="flex-1">
            <div className="mb-6">
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground">Welcome back to the Top 1% Club</p>
            </div>

            <Tabs defaultValue="discussions" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-6 bg-card">
                <TabsTrigger 
                  value="discussions" 
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Users className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Discussions</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="achievements" 
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Trophy className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Achievements</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="goals" 
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Target className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Goals</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="meetings" 
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Meetings</span>
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
          </div>

          {/* Sidebar - Gamification */}
          <div className="lg:w-80 space-y-4">
            <StreakTracker />
            <DailyChallenge />
            <BadgeDisplay compact />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
