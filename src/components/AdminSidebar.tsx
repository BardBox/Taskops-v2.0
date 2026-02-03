import { Users, Building2, Palette, Settings, LayoutDashboard, Home, FolderKanban, Sparkles, Network, Layers, Folders } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
  SidebarHeader,
} from "@/components/ui/sidebar";

const items = [
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Clients", url: "/admin/clients", icon: Building2 },
  { title: "Project Templates", url: "/admin/project-templates", icon: Layers },
  { title: "Project Mapping", url: "/admin/project-mapping", icon: Folders },
  { title: "Team Mapping", url: "/admin/team-mapping", icon: Network },
  { title: "Avatar Generator", url: "/admin/avatar-generator", icon: Sparkles },
  { title: "Status & Urgency", url: "/admin/status-urgency", icon: Palette },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];



interface AdminSidebarProps {
  userRole?: string | null;
}

export function AdminSidebar({ userRole }: AdminSidebarProps) {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  const isActive = (path: string) => currentPath === path;

  // Filter items based on role
  const filteredItems = items.filter(item => {
    // Only show Avatar Generator to project owners
    if (item.title === "Avatar Generator") {
      return userRole === "project_owner";
    }
    return true;
  });

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"}>
      <SidebarHeader className="border-b p-4">
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          onClick={() => navigate("/dashboard")}
          className="w-full justify-start"
        >
          <Home className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Home</span>}
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Admin Panel</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
