import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";

interface RoleBadgeProps {
  role: string | null;
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
    business_head: {
      label: "BH",
      className: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
    },
    sales_team: {
      label: "Sales",
      className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    },
    production_superviser: {
      label: "Prod Sup",
      className: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    }
  };

  const roleConfig = config[role as keyof typeof config] || { label: role, className: "bg-gray-100 text-gray-800" };

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
