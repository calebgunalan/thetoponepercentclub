import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Members from "./pages/Members";
import Learn from "./pages/Learn";
import Leaderboard from "./pages/Leaderboard";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/members" element={<Members />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/notifications" element={<Notifications />} />
          {/* Placeholder routes - redirect to dashboard for now */}
          <Route path="/discussions" element={<Dashboard />} />
          <Route path="/achievements" element={<Dashboard />} />
          <Route path="/goals" element={<Dashboard />} />
          <Route path="/meetings" element={<Dashboard />} />
          <Route path="/masterminds" element={<Dashboard />} />
          <Route path="/messages" element={<Dashboard />} />
          <Route path="/badges" element={<Dashboard />} />
          <Route path="/progress" element={<Dashboard />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
