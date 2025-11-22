import { Home } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

export const Breadcrumbs = () => {
  const location = useLocation();
  
  // Don't show breadcrumbs on dashboard/homepage
  if (location.pathname === "/dashboard") {
    return null;
  }

  const pathSegments = location.pathname.split("/").filter(Boolean);
  
  const getPageTitle = (segment: string) => {
    switch (segment) {
      case "analytics":
        return "Performance Metrics";
      case "preferences":
        return "Preferences";
      case "account-settings":
        return "Account Settings";
      case "admin":
        return "Admin";
      case "team":
        return "My Team";
      case "profile":
        return "My Profile";
      default:
        return segment.charAt(0).toUpperCase() + segment.slice(1);
    }
  };

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
          <Link to="/dashboard" className="flex items-center gap-1">
              <Home className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {pathSegments.map((segment, index) => {
          const isLast = index === pathSegments.length - 1;
          const path = `/${pathSegments.slice(0, index + 1).join("/")}`;
          
          return (
            <div key={segment} className="flex items-center gap-1.5">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{getPageTitle(segment)}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={path}>{getPageTitle(segment)}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </div>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
