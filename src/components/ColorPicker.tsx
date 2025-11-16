import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

const colorPresets = [
  { name: "Red", bg: "bg-red-500", text: "text-white", value: "bg-red-500 text-white" },
  { name: "Orange", bg: "bg-orange-500", text: "text-white", value: "bg-orange-500 text-white" },
  { name: "Amber", bg: "bg-amber-500", text: "text-white", value: "bg-amber-500 text-white" },
  { name: "Yellow", bg: "bg-yellow-500", text: "text-white", value: "bg-yellow-500 text-white" },
  { name: "Lime", bg: "bg-lime-500", text: "text-white", value: "bg-lime-500 text-white" },
  { name: "Green", bg: "bg-green-500", text: "text-white", value: "bg-green-500 text-white" },
  { name: "Emerald", bg: "bg-emerald-500", text: "text-white", value: "bg-emerald-500 text-white" },
  { name: "Teal", bg: "bg-teal-500", text: "text-white", value: "bg-teal-500 text-white" },
  { name: "Cyan", bg: "bg-cyan-500", text: "text-white", value: "bg-cyan-500 text-white" },
  { name: "Sky", bg: "bg-sky-500", text: "text-white", value: "bg-sky-500 text-white" },
  { name: "Blue", bg: "bg-blue-500", text: "text-white", value: "bg-blue-500 text-white" },
  { name: "Indigo", bg: "bg-indigo-500", text: "text-white", value: "bg-indigo-500 text-white" },
  { name: "Violet", bg: "bg-violet-500", text: "text-white", value: "bg-violet-500 text-white" },
  { name: "Purple", bg: "bg-purple-500", text: "text-white", value: "bg-purple-500 text-white" },
  { name: "Pink", bg: "bg-pink-500", text: "text-white", value: "bg-pink-500 text-white" },
];

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div>
      <Label>Color</Label>
      <div className="grid grid-cols-5 gap-2 mt-2">
        {colorPresets.map((color) => (
          <button
            key={color.name}
            type="button"
            onClick={() => onChange(color.value)}
            className={cn(
              "h-10 rounded-md border-2 transition-all hover:scale-110",
              color.bg,
              value === color.value ? "border-foreground ring-2 ring-ring ring-offset-2" : "border-transparent"
            )}
            title={color.name}
          />
        ))}
      </div>
      {value && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Preview:</span>
          <span className={cn("px-3 py-1 rounded-md text-sm font-medium", value)}>
            Sample
          </span>
        </div>
      )}
    </div>
  );
}
