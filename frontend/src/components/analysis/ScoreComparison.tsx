"use client";

import React from "react";
import { ArrowRight } from "lucide-react";
import ScoreCard from "./ScoreCard";
import { MatchScore } from "@/lib/schemas/match-score";

interface ScoreComparisonProps {
  originalScore: MatchScore;
  tailoredScore: MatchScore;
}

export default function ScoreComparison({ originalScore, tailoredScore }: ScoreComparisonProps) {
  const increase = tailoredScore.overallScore - originalScore.overallScore;

  const originalSubScores = [
    { label: "Skills Coverage", value: originalScore.skillCoverageScore },
    { label: "Responsibility Match", value: originalScore.responsibilityAlignmentScore },
    { label: "Keyword Density", value: originalScore.keywordScore },
    { label: "Seniority Match", value: originalScore.seniorityScore },
  ];

  const tailoredSubScores = [
    { label: "Skills Coverage", value: tailoredScore.skillCoverageScore },
    { label: "Responsibility Match", value: tailoredScore.responsibilityAlignmentScore },
    { label: "Keyword Density", value: tailoredScore.keywordScore },
    { label: "Seniority Match", value: tailoredScore.seniorityScore },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-7 items-stretch gap-4 md:gap-2">
      {/* Before Score */}
      <div className="md:col-span-3">
        <ScoreCard
          score={originalScore.overallScore}
          label="Original Resume Relevance"
          subScores={originalSubScores}
          isAfter={false}
        />
      </div>

      {/* Transition Arrow / Value Increase Badge */}
      <div className="md:col-span-1 flex flex-row md:flex-col items-center justify-center py-4 md:py-0 gap-2 select-none">
        <div className="h-0.5 w-12 md:h-12 md:w-0.5 bg-slate-200 hidden md:block" />
        
        <div className="flex flex-col items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[10px] text-text-muted font-bold tracking-wider uppercase">
            Lift
          </span>
          <span className="text-xl font-extrabold text-accent-secondary tracking-tight">
            +{increase}%
          </span>
        </div>

        <ArrowRight className="h-5 w-5 text-accent-secondary rotate-90 md:rotate-0" />
        <div className="h-0.5 w-12 md:h-12 md:w-0.5 bg-slate-200 hidden md:block" />
      </div>

      {/* After Score */}
      <div className="md:col-span-3">
        <ScoreCard
          score={tailoredScore.overallScore}
          label="Tailored Resume Relevance"
          subScores={tailoredSubScores}
          isAfter={true}
        />
      </div>
    </div>
  );
}
