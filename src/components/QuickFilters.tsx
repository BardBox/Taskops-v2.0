import { Button } from "@/components/ui/button";
import { Calendar, Clock, AlertTriangle, RefreshCw } from "lucide-react";

interface QuickFiltersProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

export const QuickFilters = ({ activeFilter, onFilterChange }: QuickFiltersProps) => {
  const quickFilters = [
    {
      id: "today",
      label: "Today",
      icon: Calendar,
      description: "Today's & pending tasks"
    },
    {
      id: "this-month",
      label: "This Month",
      icon: Clock,
      description: "This month's & pending tasks"
    },
    {
      id: "urgent",
      label: "Urgent",
      icon: AlertTriangle,
      description: "Urgent tasks only"
    },
    {
      id: "revisions",
      label: "Revisions",
      icon: RefreshCw,
      description: "Tasks with revisions"
    }
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {quickFilters.map((filter) => {
        const Icon = filter.icon;
        const isActive = activeFilter === filter.id;
        
        return (
          <Button
            key={filter.id}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => onFilterChange(isActive ? "all" : filter.id)}
            className="gap-2 transition-all hover:scale-105"
            title={filter.description}
          >
            <Icon className="h-4 w-4" />
            {filter.label}
          </Button>
        );
      })}
      
      {activeFilter !== "all" && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFilterChange("all")}
          className="text-muted-foreground hover:text-foreground"
        >
          Clear Filter
        </Button>
      )}
    </div>
  );
};
