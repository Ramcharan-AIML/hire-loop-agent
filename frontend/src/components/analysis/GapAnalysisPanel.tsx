"use client";

import React, { useState } from "react";
import { AlertCircle, HelpCircle, CheckCircle2, ShieldAlert, ChevronDown, ChevronUp } from "lucide-react";
import { ResumeGap } from "@/lib/schemas/gap-analysis";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface GapAnalysisPanelProps {
  gaps: ResumeGap[];
}

export default function GapAnalysisPanel({ gaps }: GapAnalysisPanelProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  // EC-6.5: Zero gaps identified success state
  if (!gaps || gaps.length === 0) {
    return (
      <div className="glass-panel border-success/20 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-3 w-full animate-fade-in-up">
        <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center text-success border border-success/20 shadow-sm">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div className="flex flex-col gap-1">
          <h4 className="text-base font-bold text-text-primary">
            No gaps detected!
          </h4>
          <p className="text-sm text-text-muted max-w-md">
            Excellent alignment! Your resume already encompasses all key requirements and tools extracted from the job description.
          </p>
        </div>
      </div>
    );
  }

  // Sort gaps: high -> medium -> low
  const sortedGaps = [...gaps].sort((a, b) => {
    const weights: Record<string, number> = { high: 3, medium: 2, low: 1 };
    return (weights[b.importance] || 0) - (weights[a.importance] || 0);
  });

  // EC-6.6: Cap initially visible gaps at 10
  const initialCap = 10;
  const hasMoreThanCap = sortedGaps.length > initialCap;
  const visibleGaps = showAll ? sortedGaps : sortedGaps.slice(0, initialCap);

  const toggleExpand = (idx: number) => {
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  const getImportanceBadge = (importance: string) => {
    switch (importance) {
      case "high":
        return (
          <Badge className="bg-danger/10 hover:bg-danger/15 text-danger border border-danger/20 font-semibold px-2 py-0.5 rounded-md">
            Critical Gap
          </Badge>
        );
      case "medium":
        return (
          <Badge className="bg-warning/10 hover:bg-warning/15 text-warning border border-warning/20 font-semibold px-2 py-0.5 rounded-md">
            Medium Gap
          </Badge>
        );
      case "low":
      default:
        return (
          <Badge className="bg-slate-100 hover:bg-slate-200 text-text-muted border border-slate-200 font-semibold px-2 py-0.5 rounded-md">
            Soft Gap
          </Badge>
        );
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 shrink-0">
        <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-warning" />
          Unresolved Requirements Gap ({sortedGaps.length})
        </h3>
        <span className="text-[10px] text-text-muted italic flex items-center gap-1">
          <ShieldAlert className="w-3.5 h-3.5 text-accent-secondary" />
          Fabrication Shield Enabled
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {visibleGaps.map((gap, idx) => {
          const isExpanded = expandedIndex === idx;

          return (
            <div
              key={idx}
              className={cn(
                "glass-panel rounded-xl overflow-hidden transition-all duration-300 border border-slate-200",
                isExpanded ? "border-slate-300 bg-slate-50/50 shadow-sm" : "hover:bg-slate-50/30"
              )}
            >
              {/* Gap Header Trigger */}
              <button
                onClick={() => toggleExpand(idx)}
                className="w-full flex items-center justify-between p-4 text-left select-none outline-none focus:bg-slate-50 cursor-pointer"
              >
                <div className="flex items-center gap-3 truncate pr-4">
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      gap.importance === "high" ? "bg-danger" : gap.importance === "medium" ? "bg-warning" : "bg-text-muted"
                    )}
                  />
                  <span className="text-sm font-bold text-text-primary truncate">
                    {gap.name}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {getImportanceBadge(gap.importance)}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-text-muted" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-text-muted" />
                  )}
                </div>
              </button>

              {/* Collapsible Details */}
              {isExpanded && (
                <div className="p-4 border-t border-slate-200 bg-white flex flex-col gap-4 animate-fade-in-up text-xs leading-relaxed text-text-muted">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* JD evidence */}
                    <div className="flex flex-col gap-1.5">
                      <span className="font-bold text-text-primary tracking-wide uppercase text-[10px] text-accent-secondary">
                        Job Requirement (Evidence)
                      </span>
                      <blockquote className="border-l-2 border-accent-secondary/35 pl-3 py-1 italic text-text-muted bg-slate-50 rounded-r-md">
                        &ldquo;{gap.jdEvidence}&rdquo;
                      </blockquote>
                    </div>
                    {/* Reason */}
                    <div className="flex flex-col gap-1.5">
                      <span className="font-bold text-text-primary tracking-wide uppercase text-[10px] text-danger">
                        Resume Assessment
                      </span>
                      <p className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                        {gap.resumeEvidence}
                      </p>
                    </div>
                  </div>

                  {/* Suggested action */}
                  <div className="flex flex-col gap-2 bg-accent-primary/5 border border-accent-primary/10 rounded-xl p-3.5">
                    <span className="font-bold text-text-primary flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                      <HelpCircle className="w-3.5 h-3.5 text-accent-primary" />
                      Actionable Recommendation
                    </span>
                    <p className="text-text-primary font-medium text-xs">
                      {gap.suggestedAction}
                    </p>
                  </div>

                  {/* Fabrication warning */}
                  <div className="flex items-center gap-2 text-[10px] text-text-muted bg-slate-50 border border-slate-200/60 rounded-lg p-2.5">
                    <ShieldAlert className="w-4 h-4 text-accent-secondary shrink-0" />
                    <span>
                      <strong>Deterministic Shield Check:</strong> This gap cannot be safely tailored into experience bullets without fabricating skills. Answer truthfully during interviews.
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* EC-6.6: Expander button */}
      {hasMoreThanCap && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-2 text-xs font-bold text-accent-secondary hover:brightness-110 flex items-center justify-center gap-1 py-2 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all outline-none cursor-pointer"
        >
          {showAll ? "Show Less Gaps" : `Show ${sortedGaps.length - initialCap} More Gaps`}
        </button>
      )}
    </div>
  );
}
