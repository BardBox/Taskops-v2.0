import React from 'react';

// Matches URLs with or without protocol (http:// or https://)
const URL_REGEX = /(https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)|(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*))/g;

interface LinkifyOptions {
  className?: string;
}

/**
 * Converts URLs in text to clickable links
 * @param text - The text containing potential URLs
 * @param options - Optional styling and behavior options
 * @returns React elements with linkified URLs
 */
export function linkifyText(text: string, options: LinkifyOptions = {}): React.ReactNode {
  const parts = text.split(URL_REGEX);
  
  return parts.map((part, index) => {
    // Check if this part is a URL
    if (part.match(URL_REGEX)) {
      // Add https:// if no protocol is present
      const href = part.match(/^https?:\/\//) ? part : `https://${part}`;
      
      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={options.className || "text-primary underline hover:text-primary/80 transition-colors break-all"}
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

