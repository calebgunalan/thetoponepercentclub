import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Target, Trophy, Calendar } from "lucide-react";
import Layout from "@/components/Layout";
import Discussions from "@/components/Discussions";
import Achievements from "@/components/Achievements";
import Goals from "@/components/Goals";
import Meetings from "@/components/Meetings";

const Dashboard = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
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
              Discussions
            </TabsTrigger>
            <TabsTrigger 
              value="achievements" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Trophy className="mr-2 h-4 w-4" />
              Achievements
            </TabsTrigger>
            <TabsTrigger 
              value="goals" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Target className="mr-2 h-4 w-4" />
              Goals
            </TabsTrigger>
            <TabsTrigger 
              value="meetings" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
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
      </div>
    </Layout>
  );
};

export default Dashboard;
