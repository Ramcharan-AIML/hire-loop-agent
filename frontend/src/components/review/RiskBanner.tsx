"use client";

import React from "react";
import { ShieldAlert, AlertTriangle, Info, ShieldCheck } from "lucide-react";
import { useTailoringStore } from "@/lib/store/tailoring-store";
import { EntityViolation, NumericViolation, GuardrailSeverity } from "@/lib/guardrails/types";
import { cn } from "@/lib/utils";

interface RiskBannerProps {
  bulletKey: string;
  entityViolations: EntityViolation[];
  numericViolations: NumericViolation[];
}

export default function RiskBanner({
  bulletKey,
  entityViolations,
  numericViolations
}: RiskBannerProps) {
  const confirmedBullets = useTailoringStore((state) => state.confirmedBullets);
  const setBulletConfirmed = useTailoringStore((state) => state.setBulletConfirmed);

  const isConfirmed = !!confirmedBullets[bulletKey];

  const totalRisks = entityViolations.length + numericViolations.length;
  if (totalRisks === 0) return null;

  // Find the highest severity risk in this bullet
  const allSeverities: GuardrailSeverity[] = [
    ...entityViolations.map((v) => v.severity),
    ...numericViolations.map((v) => v.severity)
  ];
  const hasHigh = allSeverities.includes("high");
  const hasMedium = allSeverities.includes("medium");
  const highestSeverity: GuardrailSeverity = hasHigh ? "high" : hasMedium ? "medium" : "low";

  const handleToggleConfirm = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBulletConfirmed(bulletKey, e.target.checked);
  };

  return (
    <div
      className={cn(
        "rounded-xl border p-4.5 transition-all flex flex-col gap-3.5 mt-3 select-none",
        isConfirmed
          ? "border-success/20 bg-success/2 text-text-primary"
          : highestSeverity === "high"
          ? "border-danger/20 bg-danger/5 text-text-primary"
          : highestSeverity === "medium"
          ? "border-warning/20 bg-warning/5 text-text-primary"
          : "border-primary/20 bg-primary/5 text-text-primary"
      )}
    >
      {/* Violations list */}
      <div className="flex flex-col gap-2.5">
        {/* Entity Violations */}
        {entityViolations.map((v, idx) => (
          <div key={`ent-${idx}`} className="flex items-start gap-2.5 text-xs">
            {v.severity === "high" ? (
              <ShieldAlert className="w-4 h-4 text-danger shrink-0 mt-0.5" />
            ) : (
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            )}
            <div className="flex flex-col gap-0.5">
              <span className="font-bold text-[10px] uppercase tracking-wider text-text-primary">
                {v.type === "certification" ? "Certification Guardrail Violation" : "Technology Fabrication Alert"}
              </span>
              <p className="text-text-muted font-medium leading-relaxed">{v.message}</p>
            </div>
          </div>
        ))}

        {/* Numeric Violations */}
        {numericViolations.map((v, idx) => (
          <div key={`num-${idx}`} className="flex items-start gap-2.5 text-xs">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="font-bold text-[10px] uppercase tracking-wider text-text-primary">
                Metric Fabrication Detector Flag
              </span>
              <p className="text-text-muted font-medium leading-relaxed">{v.message}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Confirmation Row */}
      <div className="flex items-center justify-between border-t border-slate-200/60 pt-3 mt-1 select-none">
        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-text-primary">
          <input
            type="checkbox"
            checked={isConfirmed}
            onChange={handleToggleConfirm}
            className="w-4 h-4 rounded border-slate-300 text-accent-primary focus:ring-accent-primary focus:ring-2 cursor-pointer"
          />
          <span>I have reviewed and confirm this bullet is factually accurate</span>
        </label>
        
        {isConfirmed && (
          <div className="flex items-center gap-1 text-[10px] text-success font-bold uppercase tracking-wider select-none shrink-0 animate-fade-in-up">
            <ShieldCheck className="w-4.5 h-4.5" />
            Confirmed
          </div>
        )}
      </div>
    </div>
  );
}
