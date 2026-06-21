"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfidenceBadgeProps {
  confidence: "high" | "medium" | "low";
}

export default function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  let colorClass = "";
  let icon = null;
  let text = "";

  switch (confidence) {
    case "high":
      colorClass = "bg-success/10 text-success border border-success/20 font-bold";
      icon = <ShieldCheck className="w-3.5 h-3.5 text-success stroke-[2.5]" />;
      text = "High Confidence";
      break;
    case "medium":
      colorClass = "bg-warning/10 text-warning border border-warning/20 font-bold";
      icon = <AlertTriangle className="w-3.5 h-3.5 text-warning stroke-[2.5]" />;
      text = "Medium Alignment";
      break;
    case "low":
    default:
      colorClass = "bg-danger/10 text-danger border border-danger/20 font-bold animate-pulse";
      icon = <AlertCircle className="w-3.5 h-3.5 text-danger stroke-[2.5]" />;
      text = "Low Alignment";
      break;
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "flex items-center gap-1 font-semibold text-[10px] uppercase tracking-wider py-1 px-2.5 rounded-lg select-none",
        colorClass
      )}
    >
      {icon}
      {text}
    </Badge>
  );
}
