import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Users, Target, Calendar, ArrowRight, Sparkles } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div 
          className="absolute inset-0 z-0 opacity-30"
          style={{
            backgroundImage: `url(${heroBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="relative z-10 container mx-auto px-4 py-24 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm text-primary font-medium">Join the Elite</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-gold bg-clip-text text-transparent leading-tight">
              The Top 1% Club
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              A premium platform for high-achievers to connect, learn, and dominate together
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-glow text-lg px-8"
              >
                Join Now <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/auth")}
                className="border-primary text-foreground hover:bg-primary/10 text-lg px-8"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gradient-dark">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Built for Achievers
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Everything you need to accelerate your journey to the top 1%
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <Card className="p-6 bg-card border-border hover:shadow-premium transition-all hover:scale-105">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Elite Discussions</h3>
              <p className="text-muted-foreground">
                Engage in meaningful conversations with other high-performers
              </p>
            </Card>

            <Card className="p-6 bg-card border-border hover:shadow-premium transition-all hover:scale-105">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Share Wins</h3>
              <p className="text-muted-foreground">
                Celebrate achievements and inspire others with your success
              </p>
            </Card>

            <Card className="p-6 bg-card border-border hover:shadow-premium transition-all hover:scale-105">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Set Goals</h3>
              <p className="text-muted-foreground">
                Plan action steps and track progress toward your ambitions
              </p>
            </Card>

            <Card className="p-6 bg-card border-border hover:shadow-premium transition-all hover:scale-105">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Network</h3>
              <p className="text-muted-foreground">
                Schedule meetings and connect with like-minded achievers
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <Card className="max-w-4xl mx-auto p-12 text-center bg-card border-border shadow-premium">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Join the Elite?
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
              Start your journey to the top 1% today. Connect with high-achievers, share knowledge, and reach your goals faster.
            </p>
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-glow text-lg px-8"
            >
              Get Started Now <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2025 The Top 1% Club. Elite minds, extraordinary results.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;