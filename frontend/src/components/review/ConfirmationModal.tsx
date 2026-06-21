"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Check } from "lucide-react";

interface UnconfirmedViolation {
  key: string;
  message: string;
  bulletText: string;
}

interface ConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unconfirmedViolations: UnconfirmedViolation[];
  onConfirmAll: () => void;
}

export default function ConfirmationModal({
  open,
  onOpenChange,
  unconfirmedViolations,
  onConfirmAll
}: ConfirmationModalProps) {
  const [checkedKeys, setCheckedKeys] = useState<Record<string, boolean>>({});

  const handleToggleCheck = (key: string) => {
    setCheckedKeys((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const allChecked = unconfirmedViolations.every(v => checkedKeys[v.key]);

  const handleConfirmAndProceed = () => {
    onConfirmAll();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto flex flex-col p-6 gap-4 bg-white border border-slate-200 shadow-2xl rounded-2xl select-none">
        <DialogHeader className="flex flex-col gap-1">
          <DialogTitle className="text-base font-bold text-text-primary flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-danger animate-pulse" />
            Factual Verification Required
          </DialogTitle>
          <DialogDescription className="text-text-muted text-xs">
            Review and acknowledge the remaining high-risk fabrication flags before downloading.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable checklists */}
        <div className="flex-1 flex flex-col gap-3.5 my-1 overflow-y-auto max-h-[45vh] pr-1">
          {unconfirmedViolations.map((v) => (
            <div
              key={v.key}
              onClick={() => handleToggleCheck(v.key)}
              className={`border rounded-xl p-3.5 flex items-start gap-3 cursor-pointer transition-all ${
                checkedKeys[v.key]
                  ? "border-success/20 bg-success/2"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <input
                type="checkbox"
                checked={!!checkedKeys[v.key]}
                onChange={() => {}} // handled by click
                className="w-4.5 h-4.5 rounded border-slate-300 text-accent-primary focus:ring-accent-primary mt-0.5 shrink-0 cursor-pointer"
              />
              <div className="flex flex-col gap-1.5 text-left text-xs">
                <span className="font-bold text-[10px] text-danger uppercase tracking-wider">
                  Fabrication Flag
                </span>
                <p className="text-text-primary font-semibold leading-relaxed">{v.message}</p>
                <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 text-[11px] text-text-muted font-mono leading-relaxed break-words italic">
                  &ldquo;{v.bulletText}&rdquo;
                </div>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 border-t border-slate-200 pt-4 mt-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto text-text-muted hover:bg-slate-100 cursor-pointer"
          >
            Cancel & Edit
          </Button>

          <Button
            onClick={handleConfirmAndProceed}
            disabled={!allChecked}
            className="w-full sm:w-auto bg-accent-primary hover:bg-accent-primary/90 text-white font-bold cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            <Check className="w-4 h-4 mr-1.5" />
            Verify All & Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
