import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

const colorPresets = [
  // Critical/High Priority Colors
  { name: "Bright Red", bg: "bg-red-500", text: "text-white", value: "bg-red-500 text-white", category: "Critical" },
  { name: "Dark Red", bg: "bg-red-700", text: "text-white", value: "bg-red-700 text-white", category: "Critical" },
  { name: "Light Red", bg: "bg-red-400", text: "text-white", value: "bg-red-400 text-white", category: "Critical" },
  
  // Warning/Attention Colors
  { name: "Bright Orange", bg: "bg-orange-500", text: "text-white", value: "bg-orange-500 text-white", category: "Warning" },
  { name: "Dark Orange", bg: "bg-orange-700", text: "text-white", value: "bg-orange-700 text-white", category: "Warning" },
  { name: "Amber", bg: "bg-amber-500", text: "text-white", value: "bg-amber-500 text-white", category: "Warning" },
  { name: "Yellow", bg: "bg-yellow-500", text: "text-gray-900", value: "bg-yellow-500 text-gray-900", category: "Warning" },
  
  // Success/Complete Colors
  { name: "Bright Green", bg: "bg-green-500", text: "text-white", value: "bg-green-500 text-white", category: "Success" },
  { name: "Dark Green", bg: "bg-green-700", text: "text-white", value: "bg-green-700 text-white", category: "Success" },
  { name: "Emerald", bg: "bg-emerald-500", text: "text-white", value: "bg-emerald-500 text-white", category: "Success" },
  { name: "Lime", bg: "bg-lime-500", text: "text-gray-900", value: "bg-lime-500 text-gray-900", category: "Success" },
  
  // In Progress/Active Colors
  { name: "Bright Blue", bg: "bg-blue-500", text: "text-white", value: "bg-blue-500 text-white", category: "Active" },
  { name: "Dark Blue", bg: "bg-blue-700", text: "text-white", value: "bg-blue-700 text-white", category: "Active" },
  { name: "Sky Blue", bg: "bg-sky-500", text: "text-white", value: "bg-sky-500 text-white", category: "Active" },
  { name: "Cyan", bg: "bg-cyan-500", text: "text-gray-900", value: "bg-cyan-500 text-gray-900", category: "Active" },
  
  // Review/Hold Colors
  { name: "Bright Purple", bg: "bg-purple-500", text: "text-white", value: "bg-purple-500 text-white", category: "Review" },
  { name: "Dark Purple", bg: "bg-purple-700", text: "text-white", value: "bg-purple-700 text-white", category: "Review" },
  { name: "Violet", bg: "bg-violet-500", text: "text-white", value: "bg-violet-500 text-white", category: "Review" },
  { name: "Indigo", bg: "bg-indigo-500", text: "text-white", value: "bg-indigo-500 text-white", category: "Review" },
  
  // Neutral/Pending Colors
  { name: "Slate", bg: "bg-slate-500", text: "text-white", value: "bg-slate-500 text-white", category: "Neutral" },
  { name: "Gray", bg: "bg-gray-500", text: "text-white", value: "bg-gray-500 text-white", category: "Neutral" },
  { name: "Dark Slate", bg: "bg-slate-700", text: "text-white", value: "bg-slate-700 text-white", category: "Neutral" },
  
  // Special Colors
  { name: "Pink", bg: "bg-pink-500", text: "text-white", value: "bg-pink-500 text-white", category: "Special" },
  { name: "Teal", bg: "bg-teal-500", text: "text-white", value: "bg-teal-500 text-white", category: "Special" },
  { name: "Rose", bg: "bg-rose-500", text: "text-white", value: "bg-rose-500 text-white", category: "Special" },
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
              <div className="grid grid-cols-4 gap-2">
                {categoryColors.map((color) => (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => onChange(color.value)}
                    className={cn(
                      "h-14 rounded-lg border-2 transition-all hover:scale-105 hover:shadow-md relative group",
                      color.bg,
                      value === color.value 
                        ? "border-foreground ring-2 ring-ring ring-offset-2 scale-105" 
                        : "border-border"
                    )}
                    title={color.name}
                  >
                    <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium">
                      <span className={color.text.replace('text-', 'bg-').replace('text-gray-900', 'bg-gray-900').replace('text-white', 'bg-white') + ' px-2 py-1 rounded shadow-sm'}>
                        {color.name}
                      </span>
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
            <span className={cn("px-4 py-2 rounded-md text-sm font-semibold shadow-sm", value)}>
              Sample Badge
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
