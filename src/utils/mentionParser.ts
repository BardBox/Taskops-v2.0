export interface MentionMatch {
  fullMatch: string;
  userName: string;
  startIndex: number;
  endIndex: number;
}

export interface MessagePart {
  type: "text" | "mention" | "currentUserMention";
  content: string;
}

export const parseMentions = (text: string): MentionMatch[] => {
  // Match @mentions (@ followed by one or more words)
  const mentionRegex = /@([\w\s]+?)(?=\s|$|[.,!?])/g;
  const matches: MentionMatch[] = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    matches.push({
      fullMatch: match[0],
      userName: match[1].trim(),
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  return matches;
};

export const getUserIdsFromMentions = async (
  text: string,
  supabase: any
): Promise<string[]> => {
  const mentions = parseMentions(text);
  if (mentions.length === 0) return [];

  const userNames = mentions.map((m) => m.userName);
  
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .in("full_name", userNames);

  if (error) {
    console.error("Error fetching mentioned users:", error);
    return [];
  }

  return data?.map((user: any) => user.id) || [];
};

export const parseMessageIntoParts = (
  text: string,
  currentUserName: string | null
): MessagePart[] => {
  const mentions = parseMentions(text);
  if (mentions.length === 0) return [{ type: "text", content: text }];

  const parts: MessagePart[] = [];
  let lastIndex = 0;

  mentions.forEach((mention) => {
    // Add text before mention
    if (mention.startIndex > lastIndex) {
      parts.push({
        type: "text",
        content: text.substring(lastIndex, mention.startIndex),
      });
    }

    // Check if this mention is the current user
    const isCurrentUser = currentUserName && mention.userName === currentUserName;

    // Add mention
    parts.push({
      type: isCurrentUser ? "currentUserMention" : "mention",
      content: mention.fullMatch,
    });

    lastIndex = mention.endIndex;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: "text",
      content: text.substring(lastIndex),
    });
  }

  return parts;
};
