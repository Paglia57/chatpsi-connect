import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import React from "react"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatMessageContent(content: string): React.ReactNode {
  if (!content) return content;

  // Split content into parts while preserving the delimiters
  const parts = content.split(/(\*\*[^*]+\*\*|https?:\/\/[^\s),.;!?]+)/g);
  
  return parts.map((part, index) => {
    // Check if it's bold text (**text**)
    if (part.startsWith('**') && part.endsWith('**')) {
      const boldText = part.slice(2, -2);
      return React.createElement('strong', { key: index }, boldText);
    }
    
    // Check if it's a URL
    if (part.match(/^https?:\/\/[^\s),.;!?]+$/)) {
      return React.createElement('a', {
        key: index,
        href: part,
        target: '_blank',
        rel: 'noopener noreferrer',
        className: 'text-primary hover:text-primary/80 underline break-all'
      }, part);
    }
    
    // Regular text - preserve line breaks
    if (part.includes('\n')) {
      return part.split('\n').map((line, lineIndex, array) => 
        React.createElement(React.Fragment, { key: `${index}-${lineIndex}` }, 
          line, 
          lineIndex < array.length - 1 ? React.createElement('br') : null
        )
      );
    }
    
    return part;
  });
}
