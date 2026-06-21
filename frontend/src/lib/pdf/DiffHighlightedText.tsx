"use client";

import React from "react";
import { computeWordDiff } from "./diff-engine";
import { cn } from "@/lib/utils";

interface DiffHighlightedTextProps {
  original: string;
  tailored: string;
  className?: string;
}

export default function DiffHighlightedText({
  original,
  tailored,
  className
}: DiffHighlightedTextProps) {
  const segments = computeWordDiff(original, tailored);

  return (
    <p className={cn("text-xs leading-relaxed break-words whitespace-pre-wrap leading-relaxed", className)}>
      {segments.map((seg, idx) => {
        if (seg.type === "added") {
          return (
            <span
              key={idx}
              className="bg-emerald-100 text-emerald-900 px-1 py-0.5 rounded font-bold border-b-2 border-emerald-300"
            >
              {seg.value}
            </span>
          );
        }
        if (seg.type === "removed") {
          return (
            <span
              key={idx}
              className="bg-rose-100 text-rose-800 px-1 py-0.5 rounded line-through text-rose-500 decoration-rose-500 border-b-2 border-rose-300"
            >
              {seg.value}
            </span>
          );
        }
        return <span key={idx}>{seg.value}</span>;
      })}
    </p>
  );
}
