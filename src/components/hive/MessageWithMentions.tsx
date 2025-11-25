import React from "react";
import { parseMessageIntoParts, MessagePart } from "@/utils/mentionParser";
import { linkifyText } from "@/utils/linkify";

interface MessageWithMentionsProps {
  text: string;
  currentUserName: string | null;
}

export const MessageWithMentions = ({ text, currentUserName }: MessageWithMentionsProps) => {
  const parts = parseMessageIntoParts(text, currentUserName);

  return (
    <>
      {parts.map((part: MessagePart, idx: number) => {
        if (part.type === "text") {
          // Linkify URLs in regular text - return as fragment
          return <React.Fragment key={idx}>{linkifyText(part.content)}</React.Fragment>;
        }
        
        if (part.type === "currentUserMention") {
          return (
            <span
              key={idx}
              className="font-semibold bg-background/20 px-1 rounded"
            >
              {part.content}
            </span>
          );
        }
        
        // Regular mention
        return (
          <span
            key={idx}
            className="font-semibold bg-background/10 px-1 rounded"
          >
            {part.content}
          </span>
        );
      })}
    </>
  );
};
