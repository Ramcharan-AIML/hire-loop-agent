"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTailoringStore } from "@/lib/store/tailoring-store";
import SideBySideDiff from "@/components/review/SideBySideDiff";
import GuardrailSummary from "@/components/review/GuardrailSummary";
import ConfirmationModal from "@/components/review/ConfirmationModal";
import { Button } from "@/components/ui/button";
import { Eye, ArrowRight, ArrowLeft } from "lucide-react";
import { checkEntityIntersection } from "@/lib/guardrails/entity-checker";
import { checkNumericFabrication } from "@/lib/guardrails/numeric-checker";

export default function ReviewPage() {
  const router = useRouter();
  const runData = useTailoringStore((state) => state.runData);
  const confirmedBullets = useTailoringStore((state) => state.confirmedBullets);
  const confirmAllBullets = useTailoringStore((state) => state.confirmAllBullets);
  
  const [isHydrated, setIsHydrated] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Safe client hydration checks
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
        <span className="text-sm text-text-muted">Loading Comparison Matrix...</span>
      </div>
    );
  }

  // 1. Run live post-processing guardrail checks
  const entityViolations = checkEntityIntersection(runData.originalResume, runData.tailoredResume);
  const numericViolations = checkNumericFabrication(runData.originalResume, runData.tailoredResume);

  const highRiskEntityViolations = entityViolations.filter(v => v.severity === "high");
  const highRiskNumericViolations = numericViolations.filter(v => v.severity === "high");

  // Format list of unconfirmed high-risk violations for the blocking verification modal
  const unconfirmedHighRiskViolations = [
    ...highRiskEntityViolations.map(v => {
      const key = v.experienceIndex !== undefined 
        ? `exp_${v.experienceIndex}_bullet_${v.bulletIndex}` 
        : `proj_${v.projectIndex}_bullet_${v.bulletIndex}`;
      const bulletText = v.experienceIndex !== undefined
        ? runData.tailoredResume.tailoredExperience[v.experienceIndex].bullets[v.bulletIndex!].tailored
        : runData.tailoredResume.tailoredProjects[v.projectIndex!].bullets[v.bulletIndex!].tailored;
      return { key, message: v.message, bulletText };
    }),
    ...highRiskNumericViolations.map(v => {
      const key = v.experienceIndex !== undefined 
        ? `exp_${v.experienceIndex}_bullet_${v.bulletIndex}` 
        : `proj_${v.projectIndex}_bullet_${v.bulletIndex}`;
      const bulletText = v.experienceIndex !== undefined
        ? runData.tailoredResume.tailoredExperience[v.experienceIndex].bullets[v.bulletIndex!].tailored
        : runData.tailoredResume.tailoredProjects[v.projectIndex!].bullets[v.bulletIndex!].tailored;
      return { key, message: v.message, bulletText };
    })
  ].filter((item, index, self) => 
    self.findIndex(t => t.key === item.key) === index // unique by bullet key
  ).filter(v => !confirmedBullets[v.key]);

  // Aggregate high-risk bullet keys to count total confirmed count
  const uniqueHighRiskKeys = Array.from(new Set([
    ...highRiskEntityViolations.map(v => v.experienceIndex !== undefined ? `exp_${v.experienceIndex}_bullet_${v.bulletIndex}` : `proj_${v.projectIndex}_bullet_${v.bulletIndex}`),
    ...highRiskNumericViolations.map(v => v.experienceIndex !== undefined ? `exp_${v.experienceIndex}_bullet_${v.bulletIndex}` : `proj_${v.projectIndex}_bullet_${v.bulletIndex}`)
  ]));

  const totalHighRiskConfirmed = uniqueHighRiskKeys.filter(key => confirmedBullets[key]).length;

  // Intercept proceed to export action if unconfirmed high-risk discrepancies remain
  const handleProceed = () => {
    if (unconfirmedHighRiskViolations.length > 0) {
      setIsModalOpen(true);
    } else {
      router.push("/export");
    }
  };

  const handleConfirmAll = () => {
    const keysToConfirm = unconfirmedHighRiskViolations.map(v => v.key);
    confirmAllBullets(keysToConfirm);
    // Instantly navigate to export upon confirmation acknowledging risks
    router.push("/export");
  };

  // Count total tailored bullets
  const totalBullets = runData.tailoredResume.tailoredExperience.reduce(
    (acc, exp) => acc + exp.bullets.length,
    0
  ) + (runData.tailoredResume.tailoredProjects?.reduce((acc, p) => acc + p.bullets.length, 0) || 0);

  // Count changed bullets
  const changedBulletsCount = runData.tailoredResume.tailoredExperience.reduce(
    (acc, exp) => acc + exp.bullets.filter(b => b.original.trim() !== b.tailored.trim()).length,
    0
  ) + (runData.tailoredResume.tailoredProjects?.reduce((acc, p) => acc + p.bullets.filter(b => b.original.trim() !== b.tailored.trim()).length, 0) || 0);

  return (
    <div className="flex-1 flex flex-col gap-8 w-full animate-fade-in-up">
      {/* Page Title */}
      <div className="flex flex-col gap-1.5 text-center sm:text-left shrink-0">
        <h2 className="text-2xl font-bold tracking-tight text-text-primary flex items-center justify-center sm:justify-start gap-2 select-none">
          <Eye className="w-5 h-5 text-accent-primary" />
          Fidelity Comparison Matrix
        </h2>
        <p className="text-xs text-text-muted">
          Review bullet-by-bullet rewrites alongside alignment rationale and risk flags.
        </p>
      </div>

      {/* Fabrication Shield Guardrails Summary */}
      <GuardrailSummary
        entityViolations={entityViolations}
        numericViolations={numericViolations}
        totalConfirmed={totalHighRiskConfirmed}
      />

      {/* Aggregate metrics summary banner */}
      <div className="glass-panel border border-slate-200 shadow-sm bg-white rounded-2xl p-4 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-accent-primary uppercase tracking-wide">
            Run Overview:
          </span>
          <span className="text-text-primary font-medium">
            Optimized <strong>{changedBulletsCount}</strong> out of {totalBullets} total bullets.
          </span>
        </div>
      </div>

      {/* Bullet comparison panels list */}
      <div className="flex-1 min-h-0">
        <SideBySideDiff tailoredResume={runData.tailoredResume} />
      </div>

      {/* Control Actions Row */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0 py-2 border-t border-slate-200 mt-4">
        <Button
          variant="ghost"
          onClick={() => router.push("/analyze")}
          className="w-full sm:w-auto text-text-muted hover:text-text-primary hover:bg-slate-100 rounded-xl gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Scoring
        </Button>

        <Button
          onClick={handleProceed}
          className="w-full sm:w-auto bg-accent-primary hover:bg-accent-primary/90 text-white font-bold shadow-sm hover:shadow-md transition-all rounded-xl h-11 gap-1.5 px-6 cursor-pointer"
        >
          Proceed to Export
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Export blocking confirmation modal */}
      <ConfirmationModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        unconfirmedViolations={unconfirmedHighRiskViolations}
        onConfirmAll={handleConfirmAll}
      />
    </div>
  );
}
