import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import Profile from "./pages/Profile";
import AccountSettings from "./pages/AccountSettings";
import Preferences from "./pages/Preferences";
import NotFound from "./pages/NotFound";
import AdminLayout from "./pages/admin/AdminLayout";
import { ThemeProvider } from "@/components/ThemeProvider";
import AdminOverview from "./pages/admin/Overview";
import AdminUsers from "./pages/admin/Users";
import AdminClients from "./pages/admin/Clients";
import AdminProjects from "./pages/admin/Projects";
import StatusUrgency from "./pages/admin/StatusUrgency";
import AdminSettings from "./pages/admin/Settings";
import AvatarGenerator from "./pages/admin/AvatarGenerator";
import TeamMapping from "./pages/admin/TeamMapping";
import PMPerformance from "./pages/analytics/PMPerformance";
import ClientPerformance from "./pages/analytics/ClientPerformance";
import Overview from "./pages/analytics/Overview";
import PersonalAnalytics from "./pages/analytics/PersonalAnalytics";
import Leaderboard from "./pages/analytics/Leaderboard";
import TimeTracking from "./pages/analytics/TimeTracking";
import About from "./pages/About";
import NotificationCenter from "./pages/NotificationCenter";
import Team from "./pages/Team";
import TheHive from "./pages/TheHive";
import PostingStatus from "./pages/PostingStatus";
import { supabase } from "@/integrations/supabase/client";
import { TimeTrackingProvider } from "@/contexts/TimeTrackingContext";

const queryClient = new QueryClient();

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Index /></PageTransition>} />
        <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
        <Route path="/forgot-password" element={<PageTransition><ForgotPassword /></PageTransition>} />
        <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
        <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
        <Route path="/analytics" element={<PageTransition><Analytics /></PageTransition>} />
        <Route path="/analytics/overview" element={<PageTransition><Overview /></PageTransition>} />
        <Route path="/analytics/personal" element={<PageTransition><PersonalAnalytics /></PageTransition>} />
        <Route path="/analytics/leaderboard" element={<PageTransition><Leaderboard /></PageTransition>} />
        <Route path="/analytics/time-tracking" element={<PageTransition><TimeTracking /></PageTransition>} />
        <Route path="/analytics/pm" element={<PageTransition><PMPerformance /></PageTransition>} />
        <Route path="/analytics/client" element={<PageTransition><ClientPerformance /></PageTransition>} />
        <Route path="/profile" element={<PageTransition><Profile /></PageTransition>} />
        <Route path="/account-settings" element={<PageTransition><AccountSettings /></PageTransition>} />
        <Route path="/preferences" element={<PageTransition><Preferences /></PageTransition>} />
        <Route path="/about" element={<PageTransition><About /></PageTransition>} />
        <Route path="/notifications" element={<PageTransition><NotificationCenter /></PageTransition>} />
        <Route path="/team" element={<PageTransition><Team /></PageTransition>} />
        <Route path="/hive" element={<PageTransition><TheHive /></PageTransition>} />
        <Route path="/posting-status" element={<PageTransition><PostingStatus /></PageTransition>} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<PageTransition><AdminOverview /></PageTransition>} />
          <Route path="users" element={<PageTransition><AdminUsers /></PageTransition>} />
          <Route path="clients" element={<PageTransition><AdminClients /></PageTransition>} />
          <Route path="projects" element={<PageTransition><AdminProjects /></PageTransition>} />
          <Route path="team-mapping" element={<PageTransition><TeamMapping /></PageTransition>} />
          <Route path="status-urgency" element={<PageTransition><StatusUrgency /></PageTransition>} />
          <Route path="avatar-generator" element={<PageTransition><AvatarGenerator /></PageTransition>} />
          <Route path="settings" element={<PageTransition><AdminSettings /></PageTransition>} />
        </Route>

        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
}

const App = () => {
  useEffect(() => {
    // Set up session refresh interval
    const refreshInterval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
        const now = Date.now();
        const timeUntilExpiry = expiresAt - now;

        // Refresh if less than 20% of session time remaining (typically 12 minutes for 1-hour sessions)
        if (timeUntilExpiry < 12 * 60 * 1000) {
          await supabase.auth.refreshSession();
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(refreshInterval);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="taskops-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <TimeTrackingProvider>
            <BrowserRouter>
              <AnimatedRoutes />
            </BrowserRouter>
          </TimeTrackingProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
