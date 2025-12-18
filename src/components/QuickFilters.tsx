import { cn } from "@/lib/utils";
import { Calendar, Clock, AlertTriangle, RefreshCw, ListChecks, Bell, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface QuickFiltersProps {
  activeFilters: string[];
  onFiltersChange: (filters: string[]) => void;
  userRole?: string;
  userId?: string;
}

export const QuickFilters = ({ activeFilters, onFiltersChange, userRole, userId }: QuickFiltersProps) => {
  const isMobile = useIsMobile();
  const timeBasedFilters = ["today", "7-days", "30-days", "this-month"];
  const additiveFilters = ["urgent", "revisions", "pending", "notified"];
  const exclusiveFilters = ["my-tasks", "most-busy", "least-busy"]; // These are mutually exclusive
  
  const quickFilters: Array<{
    id: string;
    label: string;
    description: string;
    type: "time" | "additive" | "exclusive";
    icon: any;
    color: string;
  }> = [
    {
      id: "today",
      label: "Today",
      description: "Today's & pending tasks (time-based)",
      type: "time",
      icon: Clock,
      color: "text-blue-500"
    },
    {
      id: "7-days",
      label: "7 Days",
      description: "Last 7 days & pending tasks (time-based)",
      type: "time",
      icon: Calendar,
      color: "text-indigo-500"
    },
    {
      id: "30-days",
      label: "30 Days",
      description: "Last 30 days & pending tasks (time-based)",
      type: "time",
      icon: Calendar,
      color: "text-violet-500"
    },
    {
      id: "this-month",
      label: "This Month",
      description: "This month's & pending tasks (time-based)",
      type: "time",
      icon: Calendar,
      color: "text-purple-500"
    },
    {
      id: "urgent",
      label: "Urgent",
      description: "Urgent tasks only (can combine)",
      type: "additive",
      icon: AlertTriangle,
      color: "text-red-500"
    },
    {
      id: "revisions",
      label: "Revisions",
      description: "Tasks with revisions (can combine)",
      type: "additive",
      icon: RefreshCw,
      color: "text-orange-500"
    },
    {
      id: "pending",
      label: "Pending",
      description: "In Progress and Doing tasks (can combine)",
      type: "additive",
      icon: ListChecks,
      color: "text-yellow-500"
    },
    {
      id: "notified",
      label: "Notified",
      description: "Tasks with notifications (can combine)",
      type: "additive",
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
        description: "Tasks where I'm owner or PM (exclusive)",
        type: "exclusive",
        icon: ListChecks,
        color: "text-cyan-500"
      },
      {
        id: "most-busy",
        label: "Most Busy",
        description: "Team member with most pending tasks (exclusive)",
        type: "exclusive",
        icon: AlertTriangle,
        color: "text-rose-500"
      },
      {
        id: "least-busy",
        label: "Least Busy",
        description: "Team member with least pending tasks (exclusive)",
        type: "exclusive",
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
      // Add the filter based on type
      if (timeBasedFilters.includes(filterId)) {
        // Remove other time-based filters, keep additive and exclusive filters
        const newFilters = activeFilters.filter(f => !timeBasedFilters.includes(f));
        onFiltersChange([...newFilters, filterId]);
      } else if (exclusiveFilters.includes(filterId)) {
        // Remove other exclusive filters, keep time-based and additive filters
        const newFilters = activeFilters.filter(f => !exclusiveFilters.includes(f));
        onFiltersChange([...newFilters, filterId]);
      } else {
        // Just add the additive filter
        onFiltersChange([...activeFilters, filterId]);
      }
    }
  };

  const FilterButton = ({ filter }: { filter: typeof quickFilters[0] }) => {
    const isActive = activeFilters.includes(filter.id);
    const Icon = filter.icon;
    
    return (
      <button
        onClick={() => handleFilterClick(filter.id)}
        className={cn(
          "flex items-center gap-1.5 md:gap-2 text-xs md:text-sm font-medium transition-colors hover:text-primary cursor-pointer whitespace-nowrap px-2 py-1.5 md:px-0 md:py-0 rounded-full md:rounded-none",
          isActive 
            ? "text-primary underline md:underline-offset-4 bg-primary/10 md:bg-transparent" 
            : "text-muted-foreground bg-muted/50 md:bg-transparent"
        )}
        title={filter.description}
      >
        <Icon className={cn("h-3.5 w-3.5 md:h-4 md:w-4", filter.color)} />
        {filter.label}
      </button>
    );
  };

  // Mobile: Horizontal scrollable pills
  if (isMobile) {
    return (
      <div className="w-full">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2 pb-2 px-1">
            {quickFilters.map((filter) => (
              <FilterButton key={filter.id} filter={filter} />
            ))}
            {activeFilters.length > 0 && (
              <button
                onClick={() => onFiltersChange([])}
                className="flex items-center gap-1 text-xs font-medium text-destructive bg-destructive/10 px-2 py-1.5 rounded-full whitespace-nowrap"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            )}
          </div>
          <ScrollBar orientation="horizontal" className="h-1.5" />
        </ScrollArea>
      </div>
    );
  }

  // Desktop: Original layout
  return (
    <div className="flex flex-wrap gap-6 items-center">
      {quickFilters.map((filter) => (
        <FilterButton key={filter.id} filter={filter} />
      ))}
      
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
