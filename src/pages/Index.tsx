import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent to-background">
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-8">
          <div className="space-y-4">
            <div className="flex items-center justify-center mb-6">
              <div className="h-20 w-20 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
                <span className="text-4xl font-bold text-primary-foreground">B</span>
              </div>
            </div>
            <img 
              src="/bardbox-logo.png" 
              alt="BardBox TaskOPS" 
              className="h-24 md:h-32 w-auto object-contain mx-auto"
            />
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl">
              Premium operational productivity system for creative teams
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <Button
              size="lg"
              onClick={() => navigate("/dashboard")}
              className="text-lg px-8"
            >
              Dashboard
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/auth")}
              className="text-lg px-8"
            >
              Get Started
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-4xl">
            <div className="p-6 rounded-lg bg-card border shadow-sm">
              <h3 className="font-semibold text-lg mb-2">Task Management</h3>
              <p className="text-sm text-muted-foreground">
                Track tasks with precision. Smart status workflows and automated approvals.
              </p>
            </div>
            <div className="p-6 rounded-lg bg-card border shadow-sm">
              <h3 className="font-semibold text-lg mb-2">Role-Based Access</h3>
              <p className="text-sm text-muted-foreground">
                Team Members, Project Managers, and Leadership with tailored permissions.
              </p>
            </div>
            <div className="p-6 rounded-lg bg-card border shadow-sm">
              <h3 className="font-semibold text-lg mb-2">Real-Time Insights</h3>
              <p className="text-sm text-muted-foreground">
                Live metrics, delay tracking, and performance analytics at your fingertips.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
