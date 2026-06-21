"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTailoringStore } from "@/lib/store/tailoring-store";
import { Button } from "@/components/ui/button";
import { CheckCircle2, FileText, Mail, RefreshCw, Building2, Clock } from "lucide-react";

export default function DonePage() {
  const router = useRouter();
  const sentLog = useTailoringStore((s) => s.sentLog);
  const resetRun = useTailoringStore((s) => s.resetRun);

  const handleStartOver = () => {
    resetRun();
    router.push("/discover");
  };

  const statusStyles: Record<string, string> = {
    sent: "text-success bg-success/10 border-success/20",
    drafted: "text-accent-primary bg-accent-primary/10 border-accent-primary/20",
    skipped: "text-text-muted bg-slate-100 border-slate-200",
    failed: "text-danger bg-danger/10 border-danger/20",
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 py-10 animate-fade-in-up max-w-2xl mx-auto w-full">
      <div className="flex flex-col items-center text-center gap-3 select-none">
        <div className="w-16 h-16 rounded-full bg-success/10 border border-success/20 flex items-center justify-center">
          <CheckCircle2 className="w-9 h-9 text-success" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-text-primary">All done!</h2>
        <p className="text-sm text-text-muted max-w-md">
          You went from job search to a tailored, approved outreach email — all in one place.
        </p>
      </div>

      {sentLog ? (
        <div className="w-full glass-panel rounded-2xl p-5 flex flex-col gap-4 bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Mail className="w-4 h-4 text-accent-primary" /> Outreach record
            </h3>
            <span className={`text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border ${statusStyles[sentLog.status] ?? statusStyles.skipped}`}>
              {sentLog.status}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <Info icon={<Building2 className="w-3.5 h-3.5" />} label="Company" value={sentLog.company} />
            <Info icon={<FileText className="w-3.5 h-3.5" />} label="Role" value={sentLog.role} />
            <Info icon={<Mail className="w-3.5 h-3.5" />} label="Recipient" value={sentLog.recipient_email} />
            <Info icon={<Clock className="w-3.5 h-3.5" />} label="Time" value={sentLog.timestamp} />
          </div>

          <div className="flex flex-col gap-1 text-xs">
            <span className="text-[11px] font-bold uppercase tracking-wide text-text-muted">Subject</span>
            <span className="text-text-primary">{sentLog.subject}</span>
          </div>

          {sentLog.error_message && (
            <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg p-3">{sentLog.error_message}</p>
          )}
        </div>
      ) : (
        <div className="w-full text-center text-sm text-text-muted py-6 select-none">
          No outreach record found. You may have skipped sending.
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
        <Button onClick={handleStartOver}
          className="h-11 rounded-xl text-sm font-bold bg-accent-primary hover:bg-accent-primary/90 text-white px-6 cursor-pointer">
          <RefreshCw className="w-4 h-4 mr-1.5" /> Start a new application
        </Button>
        <Link href="/outreach">
          <Button variant="outline" className="h-11 rounded-xl text-sm font-bold border-slate-200 text-text-primary bg-white px-6 w-full cursor-pointer">
            Back to Outreach
          </Button>
        </Link>
      </div>
    </div>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-text-muted">{icon}{label}</span>
      <span className="text-text-primary break-words">{value || "—"}</span>
    </div>
  );
}
