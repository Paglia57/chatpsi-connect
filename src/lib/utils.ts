import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import React from "react"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatMessageContent(content: string): React.ReactNode {
  if (!content) return content;

  // First, clean up duplicate URLs after Markdown links
  // Pattern: [text](url) url | → [text](url)
  const cleanedContent = content.replace(
    /(\[([^\]]+)\]\(([^)]+)\))\s+\3\s*\|?/g,
    '$1'
  );

  // Split content into parts while preserving the delimiters
  // Captures: **bold**, [text](url), and direct URLs
  const parts = cleanedContent.split(/(\*\*[^*]+\*\*|\[([^\]]+)\]\(([^)]+)\)|https?:\/\/[^\s),.;!?]+)/g);
  
  return parts.map((part, index) => {
    // Skip undefined/empty parts from regex groups
    if (!part) return null;
    
    // Check if it's bold text (**text**)
    if (part.startsWith('**') && part.endsWith('**')) {
      const boldText = part.slice(2, -2);
      return React.createElement('strong', { key: index }, boldText);
    }
    
    // Check if it's a Markdown link [text](url)
    const markdownLinkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (markdownLinkMatch) {
      const linkText = markdownLinkMatch[1];
      const linkUrl = markdownLinkMatch[2];
      return React.createElement('a', {
        key: index,
        href: linkUrl,
        target: '_blank',
        rel: 'noopener noreferrer',
        className: 'text-primary hover:text-primary/80 underline break-all cursor-pointer'
      }, linkText);
    }
    
    // Check if it's a direct URL
    if (part.match(/^https?:\/\/[^\s),.;!?]+$/)) {
      return React.createElement('a', {
        key: index,
        href: part,
        target: '_blank',
        rel: 'noopener noreferrer',
        className: 'text-primary hover:text-primary/80 underline break-all cursor-pointer'
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
