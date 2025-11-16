import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  type?: "status" | "urgency";
}

// 20 Soft Pastel Colors for Status
const statusColorPresets = [
  // Soft Blues
  { name: "Powder Blue", value: "bg-status-powder-blue text-status-powder-blue-foreground", preview: "bg-status-powder-blue" },
  { name: "Sky Blue", value: "bg-status-sky-blue text-status-sky-blue-foreground", preview: "bg-status-sky-blue" },
  { name: "Periwinkle", value: "bg-status-periwinkle text-status-periwinkle-foreground", preview: "bg-status-periwinkle" },
  { name: "Ice Blue", value: "bg-status-ice-blue text-status-ice-blue-foreground", preview: "bg-status-ice-blue" },
  
  // Soft Greens
  { name: "Mint", value: "bg-status-mint text-status-mint-foreground", preview: "bg-status-mint" },
  { name: "Sage", value: "bg-status-sage text-status-sage-foreground", preview: "bg-status-sage" },
  { name: "Seafoam", value: "bg-status-seafoam text-status-seafoam-foreground", preview: "bg-status-seafoam" },
  { name: "Pistachio", value: "bg-status-pistachio text-status-pistachio-foreground", preview: "bg-status-pistachio" },
  
  // Soft Yellows/Oranges
  { name: "Cream", value: "bg-status-cream text-status-cream-foreground", preview: "bg-status-cream" },
  { name: "Peach", value: "bg-status-peach text-status-peach-foreground", preview: "bg-status-peach" },
  { name: "Apricot", value: "bg-status-apricot text-status-apricot-foreground", preview: "bg-status-apricot" },
  { name: "Buttercup", value: "bg-status-buttercup text-status-buttercup-foreground", preview: "bg-status-buttercup" },
  
  // Soft Pinks/Roses
  { name: "Blush", value: "bg-status-blush text-status-blush-foreground", preview: "bg-status-blush" },
  { name: "Rose", value: "bg-status-rose text-status-rose-foreground", preview: "bg-status-rose" },
  { name: "Coral", value: "bg-status-coral text-status-coral-foreground", preview: "bg-status-coral" },
  { name: "Mauve", value: "bg-status-mauve text-status-mauve-foreground", preview: "bg-status-mauve" },
  
  // Soft Purples
  { name: "Lavender", value: "bg-status-lavender text-status-lavender-foreground", preview: "bg-status-lavender" },
  { name: "Lilac", value: "bg-status-lilac text-status-lilac-foreground", preview: "bg-status-lilac" },
  { name: "Periwinkle Purple", value: "bg-status-periwinkle-purple text-status-periwinkle-purple-foreground", preview: "bg-status-periwinkle-purple" },
  
  // Soft Grays
  { name: "Pearl", value: "bg-status-pearl text-status-pearl-foreground", preview: "bg-status-pearl" },
];

// 10 Urgency Colors (Green → Red spectrum)
const urgencyColorPresets = [
  { name: "Very Low", value: "bg-urgency-very-low text-urgency-very-low-foreground", preview: "bg-urgency-very-low" },
  { name: "Low", value: "bg-urgency-low text-urgency-low-foreground", preview: "bg-urgency-low" },
  { name: "Low-Medium", value: "bg-urgency-low-medium text-urgency-low-medium-foreground", preview: "bg-urgency-low-medium" },
  { name: "Medium", value: "bg-urgency-medium text-urgency-medium-foreground", preview: "bg-urgency-medium" },
  { name: "Medium-High", value: "bg-urgency-medium-high text-urgency-medium-high-foreground", preview: "bg-urgency-medium-high" },
  { name: "High", value: "bg-urgency-high text-urgency-high-foreground", preview: "bg-urgency-high" },
  { name: "Very High", value: "bg-urgency-very-high text-urgency-very-high-foreground", preview: "bg-urgency-very-high" },
  { name: "Urgent", value: "bg-urgency-urgent text-urgency-urgent-foreground", preview: "bg-urgency-urgent" },
  { name: "Critical", value: "bg-urgency-critical text-urgency-critical-foreground", preview: "bg-urgency-critical" },
  { name: "Immediate", value: "bg-urgency-immediate text-urgency-immediate-foreground", preview: "bg-urgency-immediate" },
];

export function ColorPicker({ value, onChange, type }: ColorPickerProps) {
  // If type is provided, filter colors; otherwise show all
  const colorPresets = type === "status" 
    ? statusColorPresets 
    : type === "urgency" 
    ? urgencyColorPresets 
    : [...statusColorPresets, ...urgencyColorPresets];
  
  const showCategories = !type; // Only show categories when not filtering by type
  
  return (
    <div>
      <Label className="text-base font-semibold">
        {type === "status" ? "Status Color" : type === "urgency" ? "Urgency Color" : "Color Theme"}
      </Label>
      <p className="text-sm text-muted-foreground mt-1 mb-4">
        {type === "status" 
          ? "Choose a soft pastel color for your status" 
          : type === "urgency" 
          ? "Choose a color intensity matching the urgency level"
          : "Choose a color that clearly represents the status or urgency level"}
      </p>
      
      <div className="space-y-6">
        {showCategories ? (
          // Show categorized view when no type is specified
          <>
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Status Colors (20 Soft Pastels)
              </h4>
              <div className="grid grid-cols-5 gap-3">
                {statusColorPresets.map((color) => (
                  <TooltipProvider key={color.name} delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => onChange(color.value)}
                          className={cn(
                            "w-full aspect-square rounded-full transition-all duration-200 relative flex items-center justify-center",
                            "hover:scale-110 hover:shadow-lg",
                            value === color.value 
                              ? "ring-2 ring-primary ring-offset-2 scale-110 shadow-lg" 
                              : "hover:ring-2 hover:ring-primary/50"
                          )}
                          title={color.name}
                        >
                          <div className={cn("w-full h-full rounded-full", color.preview)} />
                          {value === color.value && (
                            <Check className="absolute w-5 h-5 text-primary drop-shadow-md" />
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs font-medium">{color.name}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Urgency Colors (10 Intensity Levels)
              </h4>
              <div className="grid grid-cols-5 gap-3">
                {urgencyColorPresets.map((color) => (
                  <TooltipProvider key={color.name} delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => onChange(color.value)}
                          className={cn(
                            "w-full aspect-square transition-all duration-200 relative flex items-center justify-center",
                            "hover:scale-110 hover:shadow-lg",
                            value === color.value 
                              ? "ring-2 ring-primary ring-offset-2 scale-110 shadow-lg" 
                              : "hover:ring-2 hover:ring-primary/50"
                          )}
                          style={{
                            clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)"
                          }}
                          title={color.name}
                        >
                          <div 
                            className={cn("w-full h-full", color.preview)}
                            style={{
                              clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)"
                            }}
                          />
                          {value === color.value && (
                            <Check className="absolute w-5 h-5 text-white drop-shadow-md z-10" />
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs font-medium">{color.name}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </div>
          </>
        ) : (
          // Show filtered view based on type
          <div className="grid grid-cols-5 gap-3">
            {colorPresets.map((color) => (
              <TooltipProvider key={color.name} delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onChange(color.value)}
                      className={cn(
                        "w-full aspect-square transition-all duration-200 relative flex items-center justify-center",
                        "hover:scale-110 hover:shadow-lg",
                        type === "urgency" && "diamond-shape",
                        type === "status" && "rounded-full",
                        value === color.value 
                          ? "ring-2 ring-primary ring-offset-2 scale-110 shadow-lg" 
                          : "hover:ring-2 hover:ring-primary/50"
                      )}
                      style={type === "urgency" ? {
                        clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)"
                      } : undefined}
                      title={color.name}
                    >
                      <div 
                        className={cn("w-full h-full", color.preview, type === "status" && "rounded-full")}
                        style={type === "urgency" ? {
                          clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)"
                        } : undefined}
                      />
                      {value === color.value && (
                        <Check className={cn(
                          "absolute w-5 h-5 drop-shadow-md z-10",
                          type === "urgency" ? "text-white" : "text-primary"
                        )} />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs font-medium">{color.name}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        )}
      </div>
      
      {value && (
        <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Preview:</span>
            <Badge className={cn("px-4 py-2 text-sm", value)}>
              Sample Badge
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}
