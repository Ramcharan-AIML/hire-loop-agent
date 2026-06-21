"use client";

import React, { useEffect, useState } from "react";
import { PipelineStage } from "@/lib/api/orchestrator";
import { Check, ClipboardList, BarChart3, PenTool, ShieldAlert, Sparkles, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingOverlayProps {
  stage: PipelineStage;
  isVisible: boolean;
}

const PIPELINE_STAGES = [
  { key: "parsing_resume", label: "Ingesting & Categorizing Resume", icon: ClipboardList },
  { key: "parsing_jd", label: "Extracting Job Description Keywords", icon: Sparkles },
  { key: "scoring_original", label: "Calculating Baseline Match Score", icon: BarChart3 },
  { key: "tailoring", label: "Optimizing Experience Bullets", icon: PenTool },
  { key: "gap_analysis", label: "Auditing Unresolved Requirement Gaps", icon: ShieldAlert },
  { key: "scoring_tailored", label: "Recalculating Optimized Score Lift", icon: RefreshCw },
];

export default function LoadingOverlay({ stage, isVisible }: LoadingOverlayProps) {
  const [seconds, setSeconds] = useState(0);

  // Active stage index
  const activeIndex = PIPELINE_STAGES.findIndex((s) => s.key === stage);

  // Time counting ticker
  useEffect(() => {
    if (!isVisible) {
      setSeconds(0);
      return;
    }
    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/10 backdrop-blur-md p-4 overflow-y-auto">
      {/* Ingestion load display board */}
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 flex flex-col gap-6 shadow-2xl relative overflow-hidden animate-fade-in-up">
        
        {/* Pulsing center icon */}
        <div className="flex flex-col items-center justify-center text-center gap-3">
          <div className="relative w-14 h-14 rounded-2xl bg-accent-primary shadow-sm flex items-center justify-center select-none">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <div className="flex flex-col gap-1 mt-2">
            <h3 className="text-lg font-extrabold text-text-primary tracking-tight">
              Executing AI Reasoning Pipeline
            </h3>
            <span className="text-xs text-text-muted">
              Leveraging Groq Llama-3.3 ultra-speed processing (Elapsed: <strong className="font-mono text-accent-secondary">{seconds}s</strong>)
            </span>
          </div>
        </div>

        {/* Pipeline Progression list */}
        <div className="flex flex-col gap-3.5 border-t border-slate-100 pt-5 mt-2">
          {PIPELINE_STAGES.map((s, idx) => {
            const Icon = s.icon;
            const isCompleted = idx < activeIndex;
            const isActive = idx === activeIndex;

            return (
              <div
                key={s.key}
                className={cn(
                  "flex items-center justify-between p-3.5 rounded-xl border transition-all duration-300",
                  isActive
                    ? "bg-accent-primary/5 border-accent-primary/25"
                    : "bg-transparent border-transparent"
                )}
              >
                <div className="flex items-center gap-3 pr-4 truncate">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center border transition-all duration-300",
                      isCompleted && "bg-success/10 border border-success/20 text-success",
                      isActive && "bg-accent-primary/10 border border-accent-primary/30 text-accent-primary",
                      !isActive && !isCompleted && "bg-slate-50 border border-slate-200 text-text-muted"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4 stroke-[3]" />
                    ) : isActive && stage === s.key ? (
                      <Icon className="w-4 h-4 animate-spin" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-xs font-semibold truncate",
                      isActive ? "text-text-primary" : "text-text-muted",
                      isCompleted && "text-text-muted/80"
                    )}
                  >
                    {s.label}
                  </span>
                </div>

                {/* Progress Indicators */}
                {isActive && (
                  <span className="text-[10px] text-accent-secondary font-mono font-bold animate-pulse uppercase tracking-wider select-none shrink-0">
                    Running...
                  </span>
                )}
                {isCompleted && (
                  <span className="text-[10px] text-success font-bold uppercase tracking-wider select-none shrink-0">
                    Staged
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
