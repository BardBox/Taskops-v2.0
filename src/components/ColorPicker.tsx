import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

const colorPresets = [
  // Status Colors
  { 
    name: "Not Started", 
    value: "bg-status-todo text-status-todo-foreground", 
    category: "Status",
    preview: "bg-status-todo"
  },
  { 
    name: "In Progress", 
    value: "bg-status-doing text-status-doing-foreground", 
    category: "Status",
    preview: "bg-status-doing"
  },
  { 
    name: "In Approval", 
    value: "bg-status-hold text-status-hold-foreground", 
    category: "Status",
    preview: "bg-status-hold"
  },
  { 
    name: "Approved", 
    value: "bg-status-approved text-status-approved-foreground", 
    category: "Status",
    preview: "bg-status-approved"
  },
  { 
    name: "Revision", 
    value: "bg-status-cancelled text-status-cancelled-foreground", 
    category: "Status",
    preview: "bg-status-cancelled"
  },
  { 
    name: "On Hold", 
    value: "bg-status-done text-status-done-foreground", 
    category: "Status",
    preview: "bg-status-done"
  },
  
  // Urgency Colors
  { 
    name: "Low Priority", 
    value: "bg-urgency-low text-urgency-low-foreground", 
    category: "Urgency",
    preview: "bg-urgency-low"
  },
  { 
    name: "Medium Priority", 
    value: "bg-urgency-medium text-urgency-medium-foreground", 
    category: "Urgency",
    preview: "bg-urgency-medium"
  },
  { 
    name: "High Priority", 
    value: "bg-urgency-high text-urgency-high-foreground", 
    category: "Urgency",
    preview: "bg-urgency-high"
  },
  { 
    name: "Immediate", 
    value: "bg-urgency-immediate text-urgency-immediate-foreground", 
    category: "Urgency",
    preview: "bg-urgency-immediate"
  },
];

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const categories = Array.from(new Set(colorPresets.map(c => c.category)));
  
  return (
    <div>
      <Label className="text-base font-semibold">Color Theme</Label>
      <p className="text-sm text-muted-foreground mt-1 mb-4">
        Choose a color that clearly represents the status or urgency level
      </p>
      
      <div className="space-y-4">
        {categories.map((category) => {
          const categoryColors = colorPresets.filter(c => c.category === category);
          return (
            <div key={category}>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {category}
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {categoryColors.map((color) => (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => onChange(color.value)}
                    className={cn(
                      "h-12 rounded-lg border-2 transition-all hover:scale-105 hover:shadow-md relative flex items-center justify-center gap-2 px-3",
                      value === color.value 
                        ? "border-primary ring-2 ring-ring ring-offset-2 scale-105" 
                        : "border-border"
                    )}
                    title={color.name}
                  >
                    <div className={cn("w-6 h-6 rounded-full", color.preview)} />
                    <span className="text-xs font-medium text-foreground flex-1 text-left">
                      {color.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      
      {value && (
        <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Preview:</span>
            <Badge className={cn("px-4 py-2", value)}>
              Sample Badge
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}
