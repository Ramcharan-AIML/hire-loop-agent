"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTailoringStore } from "@/lib/store/tailoring-store";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileDown, ArrowLeft, ShieldAlert, Sparkles, CheckCircle2, RefreshCw, Mail, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function ExportPage() {
  const router = useRouter();
  const runData = useTailoringStore((state) => state.runData);
  const resetRun = useTailoringStore((state) => state.resetRun);
  
  const [isHydrated, setIsHydrated] = useState(false);
  const [downloadingType, setDownloadingType] = useState<"resume" | "proof" | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
        <span className="text-sm text-text-muted">Loading Export Panel...</span>
      </div>
    );
  }

  // Live PDF generator fetch call
  const handleDownload = async (type: "resume" | "proof") => {
    setSuccessMessage(null);
    setErrorMessage(null);
    setDownloadingType(type);
    setDownloadProgress(10);

    // Dynamic visual progress interval
    const progressInterval = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev >= 85) {
          clearInterval(progressInterval);
          return 85; // Hold at 85% until fetch finishes
        }
        return prev + 15;
      });
    }, 200);

    try {
      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          runData,
          pdfType: type,
        }),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate PDF document.");
      }

      setDownloadProgress(100);

      // Download standard file blob
      const blob = await response.blob();
      
      // Parse file name from Content-Disposition header if present
      let filename = "";
      const contentDisposition = response.headers.get("Content-Disposition");
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+?)"/);
        if (match && match[1]) {
          filename = match[1];
        }
      }

      // Fallback filename matching conventions
      if (!filename) {
        const fullName = runData.originalResume.contact.fullName.replace(/\s+/g, "_");
        const company = runData.jobDescription.company.replace(/\s+/g, "_");
        filename = type === "resume"
          ? `${fullName}_Tailored_Resume_${company}.pdf`
          : `${fullName}_Proof_Report_${company}.pdf`;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      
      // Clean up DOM objects
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setDownloadingType(null);
        setSuccessMessage(
          type === "resume"
            ? "🎉 ATS-Optimized Resume generated and downloaded successfully!"
            : "🎉 Interview Prep Comparison Proof Report downloaded successfully!"
        );
      }, 500);

    } catch (err: any) {
      clearInterval(progressInterval);
      setDownloadingType(null);
      console.error("PDF generation failed: ", err);
      setErrorMessage(err.message || "Failed to generate high-fidelity PDF.");
    }
  };

  const handleStartOver = () => {
    if (confirm("Reset current tailoring session and start a new job analysis?")) {
      resetRun();
      router.push("/input");
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-8 w-full max-w-4xl mx-auto animate-fade-in-up">
      {/* Page Title */}
      <div className="flex flex-col gap-1.5 text-center sm:text-left shrink-0">
        <h2 className="text-2xl font-bold tracking-tight text-text-primary flex items-center justify-center sm:justify-start gap-2 select-none">
          <FileDown className="w-5 h-5 text-accent-secondary" />
          Export optimized assets
        </h2>
        <p className="text-xs text-text-muted">
          Download your refined resume alongside a prep guide detailing exact changes.
        </p>
      </div>

      {/* Success alert banner */}
      {successMessage && (
        <div className="flex items-center gap-2.5 text-xs font-semibold text-success bg-success/10 border border-success/20 rounded-xl p-4 shrink-0 animate-fade-in-up">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-success" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error alert banner */}
      {errorMessage && (
        <div className="flex items-center gap-2.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl p-4 shrink-0 animate-fade-in-up">
          <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Downloading Progress Indicator */}
      {downloadingType && (
        <div className="glass-panel border border-slate-200 p-5 rounded-2xl flex flex-col gap-2 shrink-0 animate-fade-in-up bg-white shadow-sm">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-text-primary animate-pulse">
              Compiling document layers with LaTeX-grade precision...
            </span>
            <span className="text-accent-secondary font-mono">
              {downloadProgress}%
            </span>
          </div>
          <Progress value={downloadProgress} className="h-2 bg-slate-100 rounded-full" />
        </div>
      )}

      {/* Side-by-Side Download Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch flex-1">
        {/* Core ATS Resume Card */}
        <Card className="glass-panel border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col bg-white rounded-2xl">
          <CardHeader className="pb-2">
            <div className="w-10 h-10 rounded-xl bg-accent-primary/10 flex items-center justify-center border border-accent-primary/15 text-accent-primary mb-3 select-none">
              <Sparkles className="w-5 h-5" />
            </div>
            <CardTitle className="text-base font-bold text-text-primary">
              ATS-Optimized Resume
            </CardTitle>
            <CardDescription className="text-text-muted text-xs leading-relaxed">
              Standard structured professional resume featuring fully aligned summaries, highlighted keyword skills, and rephrased bullets.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto pt-6 border-t border-slate-100 flex flex-col gap-2 select-none">
            <span className="text-[10px] text-text-muted font-bold tracking-widest uppercase">
              Format: ATS-Friendly PDF
            </span>
            <Button
              onClick={() => handleDownload("resume")}
              disabled={!!downloadingType}
              className="w-full bg-accent-primary hover:bg-accent-primary/90 text-white font-bold shadow-sm hover:shadow-md transition-all rounded-xl h-11 gap-1.5 cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              Download Resume
            </Button>
          </CardContent>
        </Card>

        {/* Comparison Proof Report Card */}
        <Card className="glass-panel border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col bg-white rounded-2xl">
          <CardHeader className="pb-2">
            <div className="w-10 h-10 rounded-xl bg-accent-secondary/10 flex items-center justify-center border border-accent-secondary/15 text-accent-secondary mb-3 select-none">
              <FileDown className="w-5 h-5" />
            </div>
            <CardTitle className="text-base font-bold text-text-primary">
              Interview Proof Report
            </CardTitle>
            <CardDescription className="text-text-muted text-xs leading-relaxed">
              Premium comparison report contrasting original and tailored bullets side-by-side. Highlights scoring metrics and critical JD gaps.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto pt-6 border-t border-slate-100 flex flex-col gap-2 select-none">
            <span className="text-[10px] text-text-muted font-bold tracking-widest uppercase">
              Format: Visual Audit Report / PDF
            </span>
            <Button
              onClick={() => handleDownload("proof")}
              disabled={!!downloadingType}
              className="w-full bg-white border border-slate-200 hover:border-accent-secondary/40 hover:bg-slate-50 text-text-primary font-bold shadow-sm transition-all rounded-xl h-11 gap-1.5 cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              Download Audit Proof
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Continue to Outreach CTA */}
      <div className="glass-panel border border-accent-primary/20 shadow-sm rounded-2xl p-5 shrink-0 flex flex-col sm:flex-row gap-4 items-center justify-between bg-gradient-to-r from-accent-primary/5 to-accent-secondary/5">
        <div className="flex gap-3 items-center text-left">
          <div className="p-2.5 rounded-xl bg-accent-primary/10 border border-accent-primary/20 text-accent-primary shrink-0 select-none">
            <Mail className="w-5 h-5" />
          </div>
          <div className="flex flex-col gap-0.5">
            <h4 className="font-bold text-text-primary text-sm">Ready to reach out?</h4>
            <p className="text-xs text-text-muted leading-relaxed">
              Send a personalized outreach email to the recruiter — pre-filled from this tailored resume.
            </p>
          </div>
        </div>
        <Link href="/outreach" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto bg-accent-primary hover:bg-accent-primary/90 text-white font-bold rounded-xl h-11 gap-1.5 px-6 shadow-sm cursor-pointer">
            Continue to Outreach
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      {/* Integrity Disclaimer Banner */}
      <div className="glass-panel border border-slate-200 shadow-sm rounded-2xl p-5 shrink-0 flex gap-4 items-start bg-white">
        <div className="p-2.5 rounded-xl bg-warning/10 border border-warning/20 text-warning shrink-0 select-none">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div className="flex flex-col gap-1 text-xs text-text-muted leading-relaxed text-left">
          <h4 className="font-bold text-text-primary uppercase tracking-wide text-[10px]">
            Factual Integrity & Ethical Tailoring Reminder
          </h4>
          <p>
            This sandbox applies a strict **Fabrication Shield**. Rephrasing is limited to vocabulary alignment of experiences you already possess. Review unresolved gaps in your Interview Proof and represent your expertise truthfully to hiring managers.
          </p>
        </div>
      </div>

      {/* Control Actions Row */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0 py-2 border-t border-slate-200 mt-4">
        <Button
          variant="ghost"
          onClick={() => router.push("/review")}
          disabled={!!downloadingType}
          className="w-full sm:w-auto text-text-muted hover:text-text-primary hover:bg-slate-100 rounded-xl gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Review Bullet Matrix
        </Button>

        <Button
          onClick={handleStartOver}
          disabled={!!downloadingType}
          className="w-full sm:w-auto bg-white border border-slate-200 hover:bg-slate-50 text-text-primary font-bold rounded-xl h-11 gap-1.5 px-6 shadow-sm cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Tailor Another Resume
        </Button>
      </div>
    </div>
  );
}
