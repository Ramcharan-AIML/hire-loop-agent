"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Check, ClipboardList, PenTool, ShieldCheck, HelpCircle } from "lucide-react";
import ConfidenceBadge from "./ConfidenceBadge";
import RiskBanner from "./RiskBanner";
import { TailoredBullet } from "@/lib/schemas/tailored-resume";
import { useTailoringStore } from "@/lib/store/tailoring-store";
import { checkEntityIntersection } from "@/lib/guardrails/entity-checker";
import { checkNumericFabrication } from "@/lib/guardrails/numeric-checker";
import { cn } from "@/lib/utils";
import DiffHighlightedText from "@/lib/pdf/DiffHighlightedText";

interface BulletComparisonProps {
  bullet: TailoredBullet;
  expIdx?: number;
  projIdx?: number;
  bulletIdx: number;
}

export default function BulletComparison({
  bullet,
  expIdx,
  projIdx,
  bulletIdx
}: BulletComparisonProps) {
  const runData = useTailoringStore((state) => state.runData);
  const confirmedBullets = useTailoringStore((state) => state.confirmedBullets);

  const hasChanges = bullet.original.trim() !== bullet.tailored.trim();

  // If no run data exists, fallback to standard rendering
  if (!runData) {
    return (
      <div className="glass-panel rounded-2xl p-5 flex flex-col gap-4 w-full animate-fade-in-up border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>{bullet.original}</div>
          <div>{bullet.tailored}</div>
        </div>
      </div>
    );
  }

  // 1. Calculate guardrail violations for this specific bullet
  const allEntityViolations = checkEntityIntersection(runData.originalResume, runData.tailoredResume);
  const allNumericViolations = checkNumericFabrication(runData.originalResume, runData.tailoredResume);

  const entityViolations = allEntityViolations.filter((v) => {
    if (expIdx !== undefined) {
      return v.experienceIndex === expIdx && v.bulletIndex === bulletIdx;
    }
    if (projIdx !== undefined) {
      return v.projectIndex === projIdx && v.bulletIndex === bulletIdx;
    }
    return false;
  });

  const numericViolations = allNumericViolations.filter((v) => {
    if (expIdx !== undefined) {
      return v.experienceIndex === expIdx && v.bulletIndex === bulletIdx;
    }
    if (projIdx !== undefined) {
      return v.projectIndex === projIdx && v.bulletIndex === bulletIdx;
    }
    return false;
  });

  // Calculate unique bullet confirmation key
  const bulletKey = expIdx !== undefined
    ? `exp_${expIdx}_bullet_${bulletIdx}`
    : `proj_${projIdx}_bullet_${bulletIdx}`;

  const isConfirmed = !!confirmedBullets[bulletKey];

  // Determine border color based on validation flags
  const hasHigh = entityViolations.some(v => v.severity === "high") || numericViolations.some(v => v.severity === "high");
  const hasMedium = entityViolations.some(v => v.severity === "medium") || numericViolations.some(v => v.severity === "medium");
  const hasLow = entityViolations.some(v => v.severity === "low") || numericViolations.some(v => v.severity === "low");

  const borderClass = isConfirmed
    ? "border-l-4 border-l-success"
    : hasHigh
    ? "border-l-4 border-l-danger"
    : hasMedium
    ? "border-l-4 border-l-warning"
    : hasLow
    ? "border-l-4 border-l-primary"
    : "";

  return (
    <div
      className={cn(
        "glass-panel rounded-2xl p-5 flex flex-col gap-4 transition-all duration-300 hover:border-slate-350 hover:bg-slate-50/30 w-full animate-fade-in-up",
        borderClass
      )}
    >
      {/* Visual Alignment / Status Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1.5 select-none">
          {hasChanges ? (
            <Badge className="bg-accent-primary/15 hover:bg-accent-primary/20 text-accent-primary border border-accent-primary/20 font-bold text-[10px] tracking-wide rounded-md py-0.5 px-2">
              <PenTool className="w-3 h-3 mr-1" />
              Tailored Bullet
            </Badge>
          ) : (
            <Badge className="bg-success/15 hover:bg-success/20 text-success border border-success/20 font-bold text-[10px] tracking-wide rounded-md py-0.5 px-2">
              <Check className="w-3 h-3 mr-1 stroke-[3]" />
              Already Aligned
            </Badge>
          )}
        </div>

        {hasChanges && <ConfidenceBadge confidence={bullet.confidence} />}
      </div>

      {/* Side by side Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {/* Original Column */}
        <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200 h-full">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-1.5 select-none">
            <ClipboardList className="w-3.5 h-3.5" />
            Original Text
          </span>
          <p className="text-xs text-text-muted leading-relaxed font-medium break-words overflow-wrap-break-word">
            {bullet.original}
          </p>
        </div>

        {/* Tailored Column */}
        <div
          className={cn(
            "flex flex-col gap-2 p-3.5 rounded-xl h-full border transition-all duration-300",
            hasChanges
              ? "bg-accent-primary/5 border-accent-primary/15"
              : "bg-slate-50 border border-slate-200"
          )}
        >
          <span
            className={cn(
              "text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 select-none",
              hasChanges ? "text-accent-primary" : "text-text-muted"
            )}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Optimized Text
          </span>
          <DiffHighlightedText
            original={bullet.original}
            tailored={bullet.tailored}
            className={cn(
              "font-bold text-text-primary",
              !hasChanges && "font-medium text-text-muted"
            )}
          />
        </div>
      </div>

      {/* Metadata details (Only display when changed) */}
      {hasChanges && (
        <div className="flex flex-col gap-3 pt-3 mt-1 border-t border-slate-200 text-xs text-text-muted leading-relaxed">
          {/* Change explanation */}
          <div className="flex items-start gap-2 bg-slate-50 rounded-xl p-3.5 border border-slate-200">
            <HelpCircle className="w-4 h-4 text-accent-secondary shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="font-bold text-[10px] uppercase text-text-primary tracking-wide">
                Optimizing Rationale
              </span>
              <p>{bullet.changeReason}</p>
            </div>
          </div>

          {/* Keywords Addressed */}
          {bullet.keywordsAddressed.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider select-none text-text-muted shrink-0">
                Target Keywords:
              </span>
              <div className="flex flex-wrap gap-1">
                {bullet.keywordsAddressed.map((kw, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="border-accent-secondary/20 hover:bg-accent-secondary/5 text-accent-secondary text-[10px] font-medium px-2 py-0.5 rounded-md"
                  >
                    {kw}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Inline Risk warnings and verifications if violations exist */}
      {(entityViolations.length > 0 || numericViolations.length > 0) && (
        <RiskBanner
          bulletKey={bulletKey}
          entityViolations={entityViolations}
          numericViolations={numericViolations}
        />
      )}
    </div>
  );
}
