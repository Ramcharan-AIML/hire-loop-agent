"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTailoringStore } from "@/lib/store/tailoring-store";
import ScoreComparison from "@/components/analysis/ScoreComparison";
import JDSummaryCard from "@/components/analysis/JDSummaryCard";
import GapAnalysisPanel from "@/components/analysis/GapAnalysisPanel";
import { Button } from "@/components/ui/button";
import { BarChart3, ArrowRight, ArrowLeft } from "lucide-react";

export default function AnalyzePage() {
  const router = useRouter();
  const runData = useTailoringStore((state) => state.runData);
  const [isHydrated, setIsHydrated] = useState(false);

  // Safe client hydration hydration checks
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // EC-7.1: Route guard redirects to /input when data is missing
  useEffect(() => {
    if (isHydrated && !runData) {
      router.push("/input");
    }
  }, [isHydrated, runData, router]);

  if (!isHydrated || !runData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 text-center gap-3 select-none">
        <div className="h-6 w-6 border-2 border-accent-secondary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-text-muted">Loading Match Analytics...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-8 w-full animate-fade-in-up">
      {/* Page Title */}
      <div className="flex flex-col gap-1.5 text-center sm:text-left shrink-0">
        <h2 className="text-2xl font-bold tracking-tight text-text-primary flex items-center justify-center sm:justify-start gap-2">
          <BarChart3 className="w-5 h-5 text-accent-secondary" />
          Relevance Match Analytics
        </h2>
        <p className="text-xs text-text-muted">
          Detailed metrics evaluating original resume vs tailored improvements.
        </p>
      </div>

      {/* Main Score Comparison Widget */}
      <div className="shrink-0">
        <ScoreComparison
          originalScore={runData.originalMatch}
          tailoredScore={runData.tailoredMatch}
        />
      </div>

      {/* Score narrative explanation card */}
      <div className="glass-panel border border-slate-200 shadow-sm bg-white rounded-2xl p-5 shrink-0 text-xs sm:text-sm text-text-muted leading-relaxed">
        <span className="font-bold text-[10px] uppercase text-accent-primary tracking-widest block mb-1">
          Scoring Diagnostics Narrative
        </span>
        <p>{runData.tailoredMatch.explanation}</p>
      </div>

      {/* Grid summarizing gaps and keyword chips */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-6 min-h-0 items-start">
        <div className="lg:col-span-2 h-full">
          <JDSummaryCard jd={runData.jobDescription} />
        </div>
        <div className="lg:col-span-3 h-full">
          <GapAnalysisPanel gaps={runData.gapAnalysis.gaps} />
        </div>
      </div>

      {/* Control Actions Row */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0 py-2 border-t border-slate-200 mt-4">
        <Button
          variant="ghost"
          onClick={() => router.push("/input")}
          className="w-full sm:w-auto text-text-muted hover:text-text-primary hover:bg-slate-100 rounded-xl gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Adjust Inputs
        </Button>

        <Button
          onClick={() => router.push("/review")}
          className="w-full sm:w-auto bg-accent-primary hover:bg-accent-primary/90 text-white font-bold shadow-sm hover:shadow-md transition-all rounded-xl h-11 gap-1.5 px-6 cursor-pointer"
        >
          Review Bullet Rewrites
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
