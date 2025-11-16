import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface BadgeDropdownOption {
  label: string;
  color: string;
}

interface BadgeDropdownProps {
  options: BadgeDropdownOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  variant?: "badge" | "text";
}

export const BadgeDropdown = ({
  options,
  value,
  onChange,
  disabled = false,
  placeholder = "Select...",
  variant = "badge",
}: BadgeDropdownProps) => {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((opt) => opt.label === value);
  const displayColor = selectedOption?.color || "bg-muted text-muted-foreground";
  const isUrgency = displayColor?.includes('bg-urgency-');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        {variant === "text" ? (
          <button
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "cursor-pointer px-2 py-1 text-xs font-medium",
              "transition-all duration-200 ease-out",
              "hover:opacity-70 active:scale-95",
              "flex items-center gap-1",
              "text-foreground/80",
              disabled && "cursor-not-allowed opacity-50"
            )}
          >
            {value || placeholder}
            <ChevronDown className="h-3 w-3" />
          </button>
        ) : (
          <Badge
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium",
              "transition-all duration-200 ease-out",
              "hover:shadow-md hover:scale-105 active:scale-95",
              "flex items-center gap-1.5 w-fit",
              displayColor,
              isUrgency && "border-l-4 border-l-current/40",
              disabled && "cursor-not-allowed opacity-50 hover:scale-100 hover:shadow-none"
            )}
          >
            {value || placeholder}
            <ChevronDown className="h-3 w-3 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </Badge>
        )}
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-2 bg-background/95 backdrop-blur-sm border shadow-lg z-[100] animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 duration-200" 
        align="start"
        sideOffset={5}
      >
        <div className="flex flex-col gap-1.5">
          {options.map((option) => {
            const optionIsUrgency = option.color?.includes('bg-urgency-');
            return (
              <Badge
                key={option.label}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(option.label);
                  setOpen(false);
                }}
                className={cn(
                  "cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium",
                  "transition-all duration-200 ease-out",
                  "hover:scale-110 hover:shadow-md active:scale-95",
                  option.color,
                  optionIsUrgency && "border-l-4 border-l-current/40",
                  "justify-start"
                )}
              >
                {option.label}
              </Badge>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};
