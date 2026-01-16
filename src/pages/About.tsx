import { MainLayout } from "@/components/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Users, BarChart3, Shield, Zap, Target, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadFocusModeDocs } from "@/utils/focusModeDocumentation";

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
        <Card className="mb-12">
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

        {/* Developer Resources */}
        <Card className="mb-12 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              Developer Resources
            </CardTitle>
            <CardDescription>
              Technical documentation for feature implementations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div>
                <h3 className="font-semibold mb-1">Focus Mode Implementation</h3>
                <p className="text-sm text-muted-foreground">
                  Download the complete implementation guide for the Focus Mode feature,
                  including source code, architectural diagrams, and styling patterns.
                </p>
              </div>
              <Button onClick={downloadFocusModeDocs} className="shrink-0 gap-2">
                <FileText className="h-4 w-4" />
                Export Documentation
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Version & Copyright */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl">Version & Copyright</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Version</p>
              <p className="font-semibold">TaskOPS v1.0.0</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Copyright</p>
              <p className="font-semibold">© 2025 BardBox DigiGrowth LLP. All rights reserved.</p>
            </div>
          </CardContent>
        </Card>

        {/* Legal Information */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl">Legal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Disclaimer</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                The information provided by TaskOPS is for general informational purposes only. While we strive to keep the
                information up to date and correct, we make no representations or warranties of any kind, express or implied,
                about the completeness, accuracy, reliability, suitability, or availability of the platform or the information
                contained therein for any purpose. Any reliance you place on such information is strictly at your own risk.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Terms of Use</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                By accessing and using TaskOPS, you accept and agree to be bound by the terms and provision of this agreement.
                The use of this platform is subject to the terms and conditions set forth by BardBox DigiGrowth LLP.
                Unauthorized use of this platform may give rise to a claim for damages and/or be a criminal offense.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Privacy & Data Protection</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                BardBox DigiGrowth LLP is committed to protecting your privacy. All data collected through TaskOPS is handled
                in accordance with applicable data protection laws. We implement appropriate technical and organizational measures
                to ensure the security of your personal information. Your data will not be shared with third parties without
                your explicit consent, except as required by law.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Limitation of Liability</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                In no event shall BardBox DigiGrowth LLP be liable for any direct, indirect, incidental, special, consequential,
                or punitive damages arising out of or relating to your use of or inability to use the platform. This includes,
                but is not limited to, damages for loss of profits, data, or other intangible losses.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">License</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Unless otherwise stated, BardBox DigiGrowth LLP owns the intellectual property rights for all material on TaskOPS.
                All intellectual property rights are reserved. You may access this platform for your own personal use subject to
                restrictions set in these terms and conditions. You must not republish, sell, rent, sub-license, reproduce,
                duplicate, or redistribute material from TaskOPS without explicit written permission.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Contact Information</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                For any questions regarding these terms, please contact BardBox DigiGrowth LLP through the appropriate channels
                provided within the platform.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
