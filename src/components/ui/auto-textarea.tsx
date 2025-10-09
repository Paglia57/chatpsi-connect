import * as React from "react";
import { cn } from "@/lib/utils";

export interface AutoTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minRows?: number;
  maxRows?: number;
}

const AutoTextarea = React.forwardRef<HTMLTextAreaElement, AutoTextareaProps>(
  ({ className, minRows = 2, maxRows = 6, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>();
    const [textareaHeight, setTextareaHeight] = React.useState("auto");

    const combinedRef = React.useCallback(
      (node: HTMLTextAreaElement) => {
        textareaRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref]
    );

    const resizeTextArea = React.useCallback(() => {
      const textArea = textareaRef.current;
      if (textArea) {
        // Reset height to auto to get the correct scrollHeight
        textArea.style.height = "auto";
        const scrollHeight = textArea.scrollHeight;
        
        // Calculate min and max heights based on line height
        const lineHeight = parseInt(getComputedStyle(textArea).lineHeight) || 24;
        const minHeight = lineHeight * minRows + 16; // 16px for padding
        const maxHeight = lineHeight * maxRows + 16;
        
        // Set height within bounds
        const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
        
        textArea.style.height = `${newHeight}px`;
        textArea.style.overflowY = scrollHeight > maxHeight ? "auto" : "hidden";
        
        setTextareaHeight(`${newHeight}px`);
      }
    }, [minRows, maxRows]);

    React.useEffect(() => {
      resizeTextArea();
    }, [props.value, resizeTextArea]);

    return (
      <textarea
        className={cn(
          "flex w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-all duration-200",
          "touch-manipulation", // Better touch experience
          "min-h-[44px]", // Minimum touch target
          "max-w-full", // Garante que não ultrapasse o container
          className
        )}
        style={{ height: textareaHeight }}
        ref={combinedRef}
        onInput={resizeTextArea}
        {...props}
      />
    );
  }
);

AutoTextarea.displayName = "AutoTextarea";

export { AutoTextarea };