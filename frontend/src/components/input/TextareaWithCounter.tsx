"use client";

import React, { useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TextareaWithCounterProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  maxChars?: number;
  warnChars?: number;
}

export default function TextareaWithCounter({
  value,
  onChange,
  maxChars = 10000,
  warnChars = 8000,
  className,
  placeholder,
  ...props
}: TextareaWithCounterProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-resize handler
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to compute scrollHeight
    textarea.style.height = "auto";
    // Set to scrollHeight plus a tiny adjustment for borders
    textarea.style.height = `${Math.max(120, textarea.scrollHeight)}px`;
  }, [value]);

  // Strip HTML / sanitize handler on paste
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // Rely on standard textarea behavior for raw paste, but optionally clean tags
    const text = e.clipboardData.getData("text/plain");
    
    // Check if pasted text contains HTML tags
    if (/<[a-z][\s\S]*>/i.test(text)) {
      e.preventDefault();
      // Clean HTML tags and excessive spacing
      const cleanedText = text
        .replace(/<\/?[^>]+(>|$)/g, "") // Strip HTML tags
        .replace(/&nbsp;/g, " ")       // Replace non-breaking spaces
        .replace(/\r\n/g, "\n");       // Normalize returns

      // Programmatically update value
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newValue = value.substring(0, start) + cleanedText + value.substring(end);
      
      // Trigger artificial change event
      const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
      if (descriptor && descriptor.set) {
        descriptor.set.call(target, newValue);
      }
      
      const changeEvent = new Event("input", { bubbles: true });
      target.dispatchEvent(changeEvent);
    }
  };

  const charCount = value.length;
  const isOverMax = charCount > maxChars;
  const isOverWarn = charCount > warnChars && !isOverMax;

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={onChange}
          onPaste={handlePaste}
          placeholder={placeholder}
          className={cn(
            "w-full min-h-[120px] bg-white border-slate-200 hover:border-slate-300 focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 text-text-primary placeholder:text-text-muted rounded-xl transition-all duration-300 overflow-y-auto resize-none shadow-sm",
            isOverMax && "border-danger focus:border-danger ring-1 ring-danger/50",
            isOverWarn && "border-warning focus:border-warning ring-1 ring-warning/50",
            className
          )}
          {...props}
        />
      </div>
      
      <div className="flex justify-between items-center text-xs px-1">
        {/* Warning messages */}
        <div>
          {isOverMax && (
            <span className="text-danger flex items-center gap-1 font-semibold animate-pulse">
              <AlertCircle className="w-3.5 h-3.5" />
              Maximum character limit exceeded ({maxChars})
            </span>
          )}
          {isOverWarn && !isOverMax && (
            <span className="text-warning flex items-center gap-1 font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              Approaching limit. Consider refining to prevent processing timeouts.
            </span>
          )}
        </div>

        {/* Counter */}
        <span
          className={cn(
            "font-mono font-medium",
            isOverMax ? "text-danger" : isOverWarn ? "text-warning" : "text-text-muted"
          )}
        >
          {charCount.toLocaleString()} / {maxChars.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
