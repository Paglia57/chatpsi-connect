import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import React from "react"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Link preview card detection
interface LinkCardInfo {
  icon: string; // 'docs' | 'sheets' | 'slides' | 'drive' | 'external'
  label: string;
  truncatedUrl: string;
}

function detectLinkCard(url: string): LinkCardInfo | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    
    if (host.includes('docs.google.com')) {
      return { icon: 'docs', label: 'Documento Google Docs', truncatedUrl: parsed.hostname + '/...' };
    }
    if (host.includes('sheets.google.com')) {
      return { icon: 'sheets', label: 'Planilha Google Sheets', truncatedUrl: parsed.hostname + '/...' };
    }
    if (host.includes('slides.google.com')) {
      return { icon: 'slides', label: 'Apresentação Google Slides', truncatedUrl: parsed.hostname + '/...' };
    }
    if (host.includes('drive.google.com')) {
      return { icon: 'drive', label: 'Arquivo Google Drive', truncatedUrl: parsed.hostname + '/...' };
    }
    return null;
  } catch {
    return null;
  }
}

function createLinkCard(url: string, cardInfo: LinkCardInfo, key: number | string, customLabel?: string): React.ReactNode {
  const iconMap: Record<string, string> = {
    docs: '📄',
    sheets: '📊',
    slides: '📽️',
    drive: '📁',
    external: '🔗',
  };

  return React.createElement('a', {
    key,
    href: url,
    target: '_blank',
    rel: 'noopener noreferrer',
    className: 'flex items-center gap-3 p-3 my-1 rounded-lg border border-border bg-muted/50 hover:bg-muted transition-colors cursor-pointer no-underline block max-w-sm',
  },
    React.createElement('span', { className: 'text-xl flex-shrink-0' }, iconMap[cardInfo.icon] || iconMap.external),
    React.createElement('span', { className: 'min-w-0 flex flex-col' },
      React.createElement('span', { className: 'text-sm font-medium text-foreground truncate' }, customLabel || cardInfo.label),
      React.createElement('span', { className: 'text-xs text-muted-foreground truncate' }, cardInfo.truncatedUrl)
    )
  );
}

export function formatMessageContent(content: string): React.ReactNode {
  if (!content) return content;

  // Step 0: Normalizar quebras de linha
  let normalizedContent = content
    .replace(/\\n/g, '\n')
    .replace(/\r\n?/g, '\n');

  // Remove OpenAI assistant file citations like 【8:0†arquivo.pdf】
  normalizedContent = normalizedContent.replace(/【[^】]*】/g, '');

  // Pre-process: collapse "**Plano de ação: TÍTULO**\n...descrição...\nLink: url" into a single markdown link with title
  normalizedContent = normalizedContent.replace(
    /\*\*(Plano de ação:[^*]+)\*\*[\s\S]*?(?:Link:\s*)?(https?:\/\/[^\s)<\n]+)/g,
    '[$1]($2)'
  );

  // Remove leftover "[Acessar Link](url)" after title extraction
  normalizedContent = normalizedContent.replace(/\[Acessar Link\]\([^)]+\)\s*/g, '');

  // Step 1: Clean up spacing
  let cleanedContent = normalizedContent
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Split content into parts while preserving the delimiters
  const parts = cleanedContent.split(/(\*\*[^*]+\*\*|\[([^\]]+)\]\(([^)]+)\)|https?:\/\/[^\s)<]+|\n+)/g);
  
  return parts.map((part, index) => {
    if (!part) return null;
    
    // Handle captured line breaks as <br> elements
    if (part.match(/^\n+$/)) {
      const lineBreakCount = part.length;
      return React.createElement(
        React.Fragment,
        { key: index },
        ...Array(lineBreakCount).fill(null).map((_, i) => 
          React.createElement('br', { key: `${index}-br-${i}` })
        )
      );
    }
    
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
      const cardInfo = detectLinkCard(linkUrl);
      if (cardInfo) {
        const customLabel = linkText !== 'Acessar Link' ? linkText : undefined;
        return createLinkCard(linkUrl, cardInfo, index, customLabel);
      }
      return React.createElement('a', {
        key: index,
        href: linkUrl,
        target: '_blank',
        rel: 'noopener noreferrer',
        className: 'text-primary hover:text-primary/80 underline break-all cursor-pointer font-medium'
      }, linkText);
    }
    
    // Check if it's a direct URL
    if (part.match(/^https?:\/\/[^\s)<]+$/)) {
      const cardInfo = detectLinkCard(part);
      if (cardInfo) {
        return createLinkCard(part, cardInfo, index);
      }
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
