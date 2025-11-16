import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface BadgeSelectorOption {
  label: string;
  color: string;
}

interface InlineBadgeSelectorProps {
  options: BadgeSelectorOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export const InlineBadgeSelector = ({
  options,
  value,
  onChange,
  disabled = false,
  className,
}: InlineBadgeSelectorProps) => {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {options.map((option) => {
        const isSelected = option.label === value;
        
        return (
          <Badge
            key={option.label}
            onClick={() => !disabled && onChange(option.label)}
            className={cn(
              "cursor-pointer transition-all duration-200 px-2.5 py-1 text-xs font-medium rounded-full",
              "hover:scale-105 hover:shadow-sm",
              isSelected ? option.color : "bg-muted/50 text-muted-foreground hover:bg-muted",
              isSelected && "ring-2 ring-primary/20 shadow-sm",
              disabled && "cursor-not-allowed opacity-50 hover:scale-100"
            )}
          >
            {option.label}
          </Badge>
        );
      })}
    </div>
  );
};
