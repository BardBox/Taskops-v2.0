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

// 20 Urgency Colors (Blue → Red spectrum, NO GREEN)
const urgencyColorPresets = [
  { name: "Ice Blue 1", value: "bg-urgency-1 text-urgency-1-foreground", preview: "bg-urgency-1" },
  { name: "Ice Blue 2", value: "bg-urgency-2 text-urgency-2-foreground", preview: "bg-urgency-2" },
  { name: "Sky Blue 1", value: "bg-urgency-3 text-urgency-3-foreground", preview: "bg-urgency-3" },
  { name: "Sky Blue 2", value: "bg-urgency-4 text-urgency-4-foreground", preview: "bg-urgency-4" },
  { name: "Cyan 1", value: "bg-urgency-5 text-urgency-5-foreground", preview: "bg-urgency-5" },
  { name: "Cyan 2", value: "bg-urgency-6 text-urgency-6-foreground", preview: "bg-urgency-6" },
  { name: "Teal 1", value: "bg-urgency-7 text-urgency-7-foreground", preview: "bg-urgency-7" },
  { name: "Teal 2", value: "bg-urgency-8 text-urgency-8-foreground", preview: "bg-urgency-8" },
  { name: "Yellow 1", value: "bg-urgency-9 text-urgency-9-foreground", preview: "bg-urgency-9" },
  { name: "Yellow 2", value: "bg-urgency-10 text-urgency-10-foreground", preview: "bg-urgency-10" },
  { name: "Yellow 3", value: "bg-urgency-11 text-urgency-11-foreground", preview: "bg-urgency-11" },
  { name: "Yellow 4", value: "bg-urgency-12 text-urgency-12-foreground", preview: "bg-urgency-12" },
  { name: "Amber 1", value: "bg-urgency-13 text-urgency-13-foreground", preview: "bg-urgency-13" },
  { name: "Amber 2", value: "bg-urgency-14 text-urgency-14-foreground", preview: "bg-urgency-14" },
  { name: "Orange 1", value: "bg-urgency-15 text-urgency-15-foreground", preview: "bg-urgency-15" },
  { name: "Orange 2", value: "bg-urgency-16 text-urgency-16-foreground", preview: "bg-urgency-16" },
  { name: "Orange Red 1", value: "bg-urgency-17 text-urgency-17-foreground", preview: "bg-urgency-17" },
  { name: "Orange Red 2", value: "bg-urgency-18 text-urgency-18-foreground", preview: "bg-urgency-18" },
  { name: "Red 1", value: "bg-urgency-19 text-urgency-19-foreground", preview: "bg-urgency-19" },
  { name: "Coral Red", value: "bg-urgency-20 text-urgency-20-foreground", preview: "bg-urgency-20" },
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
          ? "Blue → Red spectrum (20 colors, no green)"
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
                Urgency Colors (20 Intensity Levels)
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
            <Badge 
              className={cn(
                "px-4 py-2 text-sm",
                value,
                type === 'urgency' && "border-l-4 border-l-current/40"
              )}
            >
              Sample Badge
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}
