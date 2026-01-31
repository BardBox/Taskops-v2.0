import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface User {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onMention?: (userId: string, userName: string) => void;
  placeholder?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

export const MentionInput = ({
  value,
  onChange,
  onMention,
  placeholder = "Type your message...",
  className,
  onKeyDown,
  disabled
}: MentionInputProps) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: users = [] } = useQuery({
    queryKey: ["allUsersForMention"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .order("full_name");

      if (error) throw error;
      return data as User[];
    },
  });

  const filteredUsers = users.filter((user) =>
    user.full_name.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  const checkTrigger = (text: string, position: number) => {
    const textBeforeCursor = text.substring(0, position);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // Check if there's no space after @ (still typing mention)
      if (!textAfterAt.includes(" ")) {
        setMentionSearch(textAfterAt);
        setShowSuggestions(true);
        setCursorPosition(lastAtIndex);
        return;
      }
    }

    setShowSuggestions(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    checkTrigger(newValue, e.target.selectionStart || 0);
  };

  const handleCursorChange = (e: React.SyntheticEvent<HTMLInputElement>) => {
    const target = e.currentTarget;
    checkTrigger(target.value, target.selectionStart || 0);
  };

  const selectUser = (user: User) => {
    const input = inputRef.current;
    if (!input) return;

    const text = value;
    const beforeMention = text.substring(0, cursorPosition);
    const afterMention = text.substring(input.selectionStart || 0);

    // Use user.full_name explicitly
    const newValue = `${beforeMention}@${user.full_name} ${afterMention}`;
    onChange(newValue);
    setShowSuggestions(false);
    setMentionSearch("");

    if (onMention) {
      onMention(user.id, user.full_name);
    }

    // Set cursor after mention
    setTimeout(() => {
      // Calculate new position based on the inserted name length
      const newPosition = beforeMention.length + user.full_name.length + 2; // +2 for @ and space
      input.focus();
      input.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  return (
    <div className="relative flex-1">
      <Input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={onKeyDown}
        onKeyUp={handleCursorChange}
        onClick={handleCursorChange}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
      />
      {showSuggestions && filteredUsers.length > 0 && (
        <div className="absolute bottom-full left-0 mb-2 w-full max-w-xs bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto z-[100]">
          {filteredUsers.slice(0, 5).map((user) => (
            <button
              key={user.id}
              onClick={() => selectUser(user)}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-accent transition-colors text-left"
              type="button"
            >
              <Avatar className="w-6 h-6">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {user.full_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{user.full_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
