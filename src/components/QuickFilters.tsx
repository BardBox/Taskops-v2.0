import { Button } from "@/components/ui/button";
import { Calendar, Clock, AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickFiltersProps {
  activeFilters: string[];
  onFiltersChange: (filters: string[]) => void;
}

export const QuickFilters = ({ activeFilters, onFiltersChange }: QuickFiltersProps) => {
  const timeBasedFilters = ["today", "this-month"];
  const additiveFilters = ["urgent", "revisions"];
  
  const quickFilters = [
    {
      id: "today",
      label: "Today",
      icon: Calendar,
      description: "Today's & pending tasks (time-based)",
      type: "time" as const
    },
    {
      id: "this-month",
      label: "This Month",
      icon: Clock,
      description: "This month's & pending tasks (time-based)",
      type: "time" as const
    },
    {
      id: "urgent",
      label: "Urgent",
      icon: AlertTriangle,
      description: "Urgent tasks only (can combine)",
      type: "additive" as const
    },
    {
      id: "revisions",
      label: "Revisions",
      icon: RefreshCw,
      description: "Tasks with revisions (can combine)",
      type: "additive" as const
    }
  ];

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
    <div className="flex flex-wrap gap-2 mb-4">
      {quickFilters.map((filter) => {
        const Icon = filter.icon;
        const isActive = activeFilters.includes(filter.id);
        const isTimeFilter = filter.type === "time";
        
        return (
          <Button
            key={filter.id}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => handleFilterClick(filter.id)}
            className="gap-2 transition-all hover:scale-105"
            title={filter.description}
          >
            <Icon 
              className={cn(
                "h-4 w-4",
                isTimeFilter ? "text-blue-500" : "text-orange-500",
                isActive && "text-current"
              )} 
            />
            {filter.label}
          </Button>
        );
      })}
      
      {activeFilters.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFiltersChange([])}
          className="text-muted-foreground hover:text-foreground"
        >
          Clear Filters
        </Button>
      )}
    </div>
  );
};
