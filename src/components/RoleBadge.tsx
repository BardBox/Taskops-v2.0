import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";

interface RoleBadgeProps {
  role: "project_manager" | "project_owner" | "team_member" | null;
  size?: "sm" | "md";
  showIcon?: boolean;
}

export const RoleBadge = ({ role, size = "md", showIcon = true }: RoleBadgeProps) => {
  if (!role || role === "team_member") return null;
  
  const config = {
    project_manager: {
      label: "PM",
      className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    },
    project_owner: {
      label: "PO",
      className: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    },
  };
  
  const roleConfig = config[role];
  
  return (
    <Badge 
      variant="outline" 
      className={`${roleConfig.className} ${size === "sm" ? "text-[10px] px-1 py-0" : "text-xs px-1.5 py-0.5"}`}
    >
      {showIcon && <Shield className={size === "sm" ? "h-2.5 w-2.5 mr-0.5" : "h-3 w-3 mr-1"} />}
      {roleConfig.label}
    </Badge>
  );
};
