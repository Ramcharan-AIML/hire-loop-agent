"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Check, ClipboardList, BarChart3, Eye, FileDown, Search, Mail, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { path: "/discover", label: "Discover", icon: Search },
  { path: "/input", label: "Input", icon: ClipboardList },
  { path: "/analyze", label: "Analyze", icon: BarChart3 },
  { path: "/review", label: "Review", icon: Eye },
  { path: "/export", label: "Export", icon: FileDown },
  { path: "/outreach", label: "Outreach", icon: Mail },
  { path: "/done", label: "Done", icon: PartyPopper },
];

export default function StepIndicator() {
  const pathname = usePathname();

  // If we are on the landing page, don't show the step indicator
  if (pathname === "/") return null;

  // Determine current active step index
  const activeIndex = STEPS.findIndex((step) => pathname === step.path);

  
  // If pathname is not one of our stepped routes, don't show
  if (activeIndex === -1) return null;


  return (
    <div className="w-full py-4 px-4 glass-panel rounded-xl mb-8 animate-fade-in-up">
      {/* Desktop view (horizontal step bar) */}
      <div className="hidden md:flex items-center justify-between max-w-4xl mx-auto relative px-4">
        {/* Connection progress lines */}
        <div className="absolute top-1/2 left-8 right-8 h-0.5 bg-border -translate-y-1/2 z-0">
          <div 
            className="h-full bg-accent-primary transition-all duration-500 ease-in-out" 
            style={{ width: `${(activeIndex / (STEPS.length - 1)) * 100}%` }}
          />
        </div>

        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isCompleted = idx < activeIndex;
          const isActive = idx === activeIndex;

          return (
            <div key={step.path} className="flex flex-col items-center relative z-10">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-500",
                  isCompleted && "bg-accent-primary border-accent-primary text-white",
                  isActive && "bg-white border-accent-primary text-accent-primary ring-2 ring-accent-primary/20 shadow-sm",
                  !isActive && !isCompleted && "bg-bg-surface border-border text-text-muted"
                )}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5 text-white stroke-[3]" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>
              <span
                className={cn(
                  "mt-2 text-xs font-medium tracking-wide uppercase transition-colors duration-300",
                  isActive && "text-accent-secondary font-bold",
                  isCompleted && "text-text-primary",
                  !isActive && !isCompleted && "text-text-muted"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Mobile view (compact layout) */}
      <div className="flex md:hidden items-center justify-between max-w-md mx-auto px-2">
        <div className="flex flex-col">
          <span className="text-[10px] text-text-muted font-semibold tracking-wider uppercase">
            Step {activeIndex + 1} of {STEPS.length}
          </span>
          <span className="text-sm font-bold text-accent-secondary">
            {STEPS[activeIndex].label}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {STEPS.map((_, idx) => (
            <div
              key={idx}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                idx === activeIndex ? "w-6 bg-accent-secondary" : idx < activeIndex ? "w-2 bg-accent-primary" : "w-2 bg-border"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
