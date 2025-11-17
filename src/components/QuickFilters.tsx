import { cn } from "@/lib/utils";

interface QuickFiltersProps {
  activeFilters: string[];
  onFiltersChange: (filters: string[]) => void;
}

export const QuickFilters = ({ activeFilters, onFiltersChange }: QuickFiltersProps) => {
  const timeBasedFilters = ["today", "this-month"];
  const additiveFilters = ["urgent", "revisions", "pending"];
  
  const quickFilters = [
    {
      id: "today",
      label: "Today",
      description: "Today's & pending tasks (time-based)",
      type: "time" as const
    },
    {
      id: "this-month",
      label: "This Month",
      description: "This month's & pending tasks (time-based)",
      type: "time" as const
    },
    {
      id: "urgent",
      label: "Urgent",
      description: "Urgent tasks only (can combine)",
      type: "additive" as const
    },
    {
      id: "revisions",
      label: "Revisions",
      description: "Tasks with revisions (can combine)",
      type: "additive" as const
    },
    {
      id: "pending",
      label: "Pending",
      description: "In Progress and Doing tasks (can combine)",
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
    <div className="flex flex-wrap gap-6 items-center">
      {quickFilters.map((filter) => {
        const isActive = activeFilters.includes(filter.id);
        
        return (
          <button
            key={filter.id}
            onClick={() => handleFilterClick(filter.id)}
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary cursor-pointer",
              isActive ? "text-primary underline underline-offset-4" : "text-muted-foreground"
            )}
            title={filter.description}
          >
            {filter.label}
          </button>
        );
      })}
      
      {activeFilters.length > 0 && (
        <button
          onClick={() => onFiltersChange([])}
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
};
