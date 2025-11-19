import { MainLayout } from "@/components/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Users, BarChart3, Shield, Zap, Target } from "lucide-react";

export default function About() {
  const features = [
    {
      icon: Target,
      title: "Task Management",
      description: "Streamline your workflow with intuitive task creation, assignment, and tracking capabilities."
    },
    {
      icon: Users,
      title: "Role-Based Access",
      description: "Secure access control with distinct roles for Project Owners, Project Managers, and Team Members."
    },
    {
      icon: BarChart3,
      title: "Analytics & Insights",
      description: "Comprehensive performance metrics and analytics to track productivity and project progress."
    },
    {
      icon: Shield,
      title: "Secure & Reliable",
      description: "Enterprise-grade security with real-time data synchronization and backup systems."
    },
    {
      icon: Zap,
      title: "Real-Time Updates",
      description: "Instant notifications and live updates keep your team synchronized and informed."
    },
    {
      icon: CheckCircle2,
      title: "Gamification",
      description: "Boost engagement with achievements, leaderboards, and performance tracking."
    }
  ];

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <Badge className="mb-4" variant="secondary">About Us</Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            TaskOPS
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Empowering teams to achieve excellence through intelligent task management and collaboration
          </p>
        </div>

        {/* Mission Statement */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl">Our Mission</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              TaskOPS is designed to transform the way teams manage projects and collaborate. We believe that effective task management 
              shouldn't be complicated. Our platform combines powerful features with an intuitive interface, enabling teams of all sizes 
              to stay organized, productive, and focused on what matters most – delivering exceptional results.
            </p>
          </CardContent>
        </Card>

        {/* Key Features */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-8 text-center">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* What Makes Us Different */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl">What Makes Us Different</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Intelligent Notifications</h3>
                <p className="text-muted-foreground">Stay informed with role-based notifications that ensure the right people get the right information at the right time.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Comprehensive Analytics</h3>
                <p className="text-muted-foreground">Make data-driven decisions with detailed performance metrics, client insights, and team productivity analytics.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Flexible Workflows</h3>
                <p className="text-muted-foreground">Adapt to your team's unique processes with customizable statuses, urgency levels, and task hierarchies.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Collaboration Tools</h3>
                <p className="text-muted-foreground">Foster teamwork with task comments, collaborator management, and real-time updates across your organization.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Technology Stack */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Built With Modern Technology</CardTitle>
            <CardDescription>
              TaskOPS leverages cutting-edge technologies to deliver a fast, reliable, and scalable platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">React</Badge>
              <Badge variant="secondary">TypeScript</Badge>
              <Badge variant="secondary">Tailwind CSS</Badge>
              <Badge variant="secondary">Lovable Cloud</Badge>
              <Badge variant="secondary">Real-time Sync</Badge>
              <Badge variant="secondary">PWA Ready</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
