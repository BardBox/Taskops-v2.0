import { cn } from "@/lib/utils";
import { Calendar, Clock, AlertTriangle, RefreshCw, ListChecks, Bell } from "lucide-react";

interface QuickFiltersProps {
  activeFilters: string[];
  onFiltersChange: (filters: string[]) => void;
  userRole?: string;
  userId?: string;
}

export const QuickFilters = ({ activeFilters, onFiltersChange, userRole, userId }: QuickFiltersProps) => {
  const timeBasedFilters = ["today", "this-month"];
  const additiveFilters = ["urgent", "revisions", "pending", "notified", "my-tasks", "most-busy", "least-busy"];
  
  const quickFilters = [
    {
      id: "today",
      label: "Today",
      description: "Today's & pending tasks (time-based)",
      type: "time" as const,
      icon: Clock,
      color: "text-blue-500"
    },
    {
      id: "this-month",
      label: "This Month",
      description: "This month's & pending tasks (time-based)",
      type: "time" as const,
      icon: Calendar,
      color: "text-purple-500"
    },
    {
      id: "urgent",
      label: "Urgent",
      description: "Urgent tasks only (can combine)",
      type: "additive" as const,
      icon: AlertTriangle,
      color: "text-red-500"
    },
    {
      id: "revisions",
      label: "Revisions",
      description: "Tasks with revisions (can combine)",
      type: "additive" as const,
      icon: RefreshCw,
      color: "text-orange-500"
    },
    {
      id: "pending",
      label: "Pending",
      description: "In Progress and Doing tasks (can combine)",
      type: "additive" as const,
      icon: ListChecks,
      color: "text-yellow-500"
    },
    {
      id: "notified",
      label: "Notified",
      description: "Tasks with notifications (can combine)",
      type: "additive" as const,
      icon: Bell,
      color: "text-lime-500"
    }
  ];

  // Add PM/PO specific filters
  const isPMOrPO = userRole === "project_manager" || userRole === "project_owner";
  if (isPMOrPO) {
    quickFilters.push(
      {
        id: "my-tasks",
        label: "My Tasks",
        description: "Tasks where I'm owner or PM (can combine)",
        type: "additive" as const,
        icon: ListChecks,
        color: "text-cyan-500"
      },
      {
        id: "most-busy",
        label: "Most Busy",
        description: "Team member with most pending tasks (can combine)",
        type: "additive" as const,
        icon: AlertTriangle,
        color: "text-rose-500"
      },
      {
        id: "least-busy",
        label: "Least Busy",
        description: "Team member with least pending tasks (can combine)",
        type: "additive" as const,
        icon: Clock,
        color: "text-emerald-500"
      }
    );
  }

  const handleFilterClick = (filterId: string) => {
    const isActive = activeFilters.includes(filterId);
    
    if (isActive) {
      // Remove the filter
      onFiltersChange(activeFilters.filter(f => f !== filterId));
    } else {
      // Add the filter
      if (timeBasedFilters.includes(filterId)) {
        // Remove other time-based filters, keep additive filters
        const newFilters = activeFilters.filter(f => !timeBasedFilters.includes(f));
        onFiltersChange([...newFilters, filterId]);
      } else {
        // Just add the additive filter
        onFiltersChange([...activeFilters, filterId]);
      }
    }
  };

  return (
    <div className="flex flex-wrap gap-6 items-center">
      {quickFilters.map((filter) => {
        const isActive = activeFilters.includes(filter.id);
        const Icon = filter.icon;
        
        return (
          <button
            key={filter.id}
            onClick={() => handleFilterClick(filter.id)}
            className={cn(
              "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary cursor-pointer",
              isActive ? "text-primary underline underline-offset-4" : "text-muted-foreground"
            )}
            title={filter.description}
          >
            <Icon className={cn("h-4 w-4", filter.color)} />
            {filter.label}
          </button>
        );
      })}
      
      <button
        onClick={() => onFiltersChange([])}
        className={cn(
          "text-sm font-medium transition-colors cursor-pointer",
          activeFilters.length > 0 
            ? "text-destructive hover:text-destructive/80" 
            : "text-muted-foreground/50 cursor-default"
        )}
        disabled={activeFilters.length === 0}
      >
        Clear Filters
      </button>
    </div>
  );
};
