"use client";

import React from "react";
import { ShieldAlert, AlertTriangle, ShieldCheck, Info } from "lucide-react";
import { EntityViolation, NumericViolation } from "@/lib/guardrails/types";
import { cn } from "@/lib/utils";

interface GuardrailSummaryProps {
  entityViolations: EntityViolation[];
  numericViolations: NumericViolation[];
  totalConfirmed: number;
}

export default function GuardrailSummary({
  entityViolations,
  numericViolations,
  totalConfirmed
}: GuardrailSummaryProps) {
  const highRiskCount = [
    ...entityViolations.filter((v) => v.severity === "high"),
    ...numericViolations.filter((v) => v.severity === "high")
  ].length;

  const mediumRiskCount = [
    ...entityViolations.filter((v) => v.severity === "medium"),
    ...numericViolations.filter((v) => v.severity === "medium")
  ].length;

  const lowRiskCount = [
    ...entityViolations.filter((v) => v.severity === "low"),
    ...numericViolations.filter((v) => v.severity === "low")
  ].length;

  const totalFlags = highRiskCount + mediumRiskCount + lowRiskCount;
  const remainingHighConfirmations = highRiskCount - totalConfirmed;

  if (totalFlags === 0) {
    return (
      <div className="glass-panel border-success/20 rounded-2xl p-4.5 shrink-0 flex items-center justify-between gap-3 text-xs bg-white shadow-sm animate-fade-in-up">
        <div className="flex items-center gap-2 text-text-primary">
          <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center border border-success/20 text-success select-none">
            <ShieldCheck className="w-4.5 h-4.5" />
          </div>
          <div>
            <span className="font-bold text-success block">Fabrication Shield Audited — 100% Verified</span>
            <span className="text-text-muted">Zero metric or technology discrepancies found. Your tailored edits are clean!</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4 animate-fade-in-up">
      {/* Alert Warning Box if High-Risk exists */}
      {highRiskCount > 0 && (
        <div
          className={cn(
            "rounded-2xl border p-4 flex gap-3 text-xs leading-relaxed transition-all shadow-sm",
            remainingHighConfirmations > 0
              ? "border-danger/25 bg-danger/5"
              : "border-success/20 bg-success/2"
          )}
        >
          <div
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 mt-0.5 select-none",
              remainingHighConfirmations > 0
                ? "bg-danger/10 border-danger/20 text-danger"
                : "bg-success/10 border-success/20 text-success"
            )}
          >
            {remainingHighConfirmations > 0 ? (
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            ) : (
              <ShieldCheck className="w-5 h-5" />
            )}
          </div>
          
          <div className="flex flex-col gap-1 text-left">
            <h4 className="font-bold text-text-primary uppercase tracking-wide text-[10px]">
              {remainingHighConfirmations > 0
                ? "Fabrication Shield Audit Required"
                : "Factual Verifications Approved"}
            </h4>
            <p className="text-text-muted font-medium">
              {remainingHighConfirmations > 0
                ? `Our post-tailoring checker identified ${highRiskCount} potential discrepancies (unmentioned tech skills or metric changes). Review each flagged work bullet and check the confirmation boxes to enable high-fidelity PDF exports.`
                : "Excellent! You have successfully reviewed and confirmed all flagged items. Export permissions are now active."}
            </p>
          </div>
        </div>
      )}

      {/* Aggregate Counts bar */}
      <div className="glass-panel border border-slate-200 shadow-sm bg-white rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs select-none">
        <div className="flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-wide text-text-primary">
          <Info className="w-4 h-4 text-accent-primary" />
          Guardrails Audit:
        </div>

        <div className="flex flex-wrap items-center gap-6">
          {highRiskCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-danger" />
              <span className="text-text-primary font-bold">
                {highRiskCount} High Risk
              </span>
              <span className="text-text-muted">
                ({totalConfirmed}/{highRiskCount} verified)
              </span>
            </div>
          )}

          {mediumRiskCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-warning" />
              <span className="text-text-primary font-bold">
                {mediumRiskCount} Medium Alignment
              </span>
            </div>
          )}

          {lowRiskCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-accent-primary" />
              <span className="text-text-primary font-bold">
                {lowRiskCount} Low Risk Soft Skills
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
