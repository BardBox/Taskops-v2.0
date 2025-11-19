import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
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
import PMPerformance from "./pages/analytics/PMPerformance";
import ClientPerformance from "./pages/analytics/ClientPerformance";
import About from "./pages/About";
import { supabase } from "@/integrations/supabase/client";

const queryClient = new QueryClient();

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
          <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/analytics/pm" element={<PMPerformance />} />
          <Route path="/analytics/client" element={<ClientPerformance />} />
          <Route path="/account-settings" element={<AccountSettings />} />
          <Route path="/preferences" element={<Preferences />} />
          <Route path="/about" element={<About />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminOverview />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="clients" element={<AdminClients />} />
            <Route path="projects" element={<AdminProjects />} />
            <Route path="status-urgency" element={<StatusUrgency />} />
            <Route path="avatar-generator" element={<AvatarGenerator />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
  );
};

export default App;
