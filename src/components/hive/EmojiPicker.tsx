import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile } from "lucide-react";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

const EMOJI_CATEGORIES = {
  "Smileys": ["😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋"],
  "Gestures": ["👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "👇", "☝️", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️"],
  "Hearts": ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "💌"],
  "Celebration": ["🎉", "🎊", "🎈", "🎁", "🎀", "🎂", "🍰", "🧁", "🥳", "🎆", "🎇", "✨", "🎄", "🎃", "🎗️", "🏆", "🥇", "🥈", "🥉", "⭐"],
  "Objects": ["💼", "📁", "📂", "📅", "📆", "📊", "📈", "📉", "💻", "⌨️", "🖱️", "🖨️", "💾", "💿", "📱", "☎️", "📞", "📟", "📠", "🔋"],
};

export const EmojiPicker = ({ onSelect }: EmojiPickerProps) => {
  const [open, setOpen] = useState(false);

  const handleEmojiClick = (emoji: string) => {
    onSelect(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Smile className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="end">
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
            <div key={category}>
              <p className="text-xs font-semibold text-muted-foreground mb-2">{category}</p>
              <div className="grid grid-cols-10 gap-1">
                {emojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleEmojiClick(emoji)}
                    className="text-xl hover:bg-accent rounded p-1 transition-colors"
                    type="button"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
