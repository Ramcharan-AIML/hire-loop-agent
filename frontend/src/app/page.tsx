"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTailoringStore } from "@/lib/store/tailoring-store";
import { sampleTailoringRun } from "@/lib/mock-data/sample-tailoring-run";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, ArrowRight, ShieldCheck, Cpu, Code2, LineChart } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const loadDemoData = useTailoringStore((state) => state.loadDemoData);
 
  const handleLoadDemo = () => {
    // Populate store with plain-text demo data
    loadDemoData();
    
    // Redirect to input sandox with auto-trigger query flag
    router.push("/input?demo=true");
  };

  const features = [
    {
      title: "Context-Aware Bullet Rewriter",
      desc: "Automatically adapts resume phrasing to target keywords without altering the factual metrics or inventing details.",
      icon: Code2,
      color: "text-accent-primary",
    },
    {
      title: "Deterministic Fabrication Shield",
      desc: "Deterministic validation alerts highlight any unmentioned technologies, soft skills, or metrics before export.",
      icon: ShieldCheck,
      color: "text-accent-secondary",
    },
    {
      title: "Multi-Dimensional Scoring",
      desc: "Aggregates skills coverage, keywords density, seniority alignment, and responsibilities mapping into one actionable lift metric.",
      icon: LineChart,
      color: "text-success",
    },
    {
      title: "High-Fidelity PDF Export",
      desc: "Downloads an ATS-optimized styled resume alongside a thorough comparison proof report for pre-interview study.",
      icon: Cpu,
      color: "text-warning",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center py-8 md:py-16 gap-16 max-w-5xl mx-auto flex-1 select-none">
      {/* Hero section */}
      <div className="text-center flex flex-col items-center gap-6 max-w-3xl animate-fade-in-up">
        {/* Decorative Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-primary/10 border border-accent-primary/15 text-xs font-semibold text-accent-primary tracking-wide uppercase select-none shadow-sm">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          The Developer's Resume Optimizer
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] text-text-primary">
          Reshape Your Experience. <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-accent-primary via-accent-secondary to-success bg-clip-text text-transparent">
            Align with Job AI.
          </span>{" "}
          <br className="hidden sm:inline" />
          Zero Fabrication.
        </h1>

        <p className="text-sm sm:text-base text-text-muted leading-relaxed max-w-xl">
          An advanced LLM pipeline that matches keywords and optimizes bullets in real-time, backed by rigid entity cross-referencing stubs.
        </p>

        {/* Action button rows */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mt-4 w-full justify-center">
          <Link href="/discover" className="w-full sm:w-auto">
            <Button
              size="lg"
              className="w-full bg-accent-primary hover:bg-accent-primary/90 text-white font-bold text-sm transition-all rounded-xl h-12 gap-1.5 px-6 shadow-sm hover:shadow-md"
            >
              Launch Platform
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>

          <Button
            size="lg"
            variant="outline"
            onClick={handleLoadDemo}
            className="w-full sm:w-auto border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-text-primary font-semibold text-sm bg-white transition-all rounded-xl h-12 px-6 shadow-sm cursor-pointer"
          >
            Try Live AI Demo
          </Button>
        </div>
      </div>

      {/* Grid Features */}
      {/* How It Works section */}
      <div className="w-full flex flex-col gap-10 select-none animate-fade-in-up">
        <div className="text-center flex flex-col gap-1.5 max-w-xl mx-auto">
          <h2 className="text-xl font-extrabold text-text-primary tracking-tight">
            How HireLoop Works
          </h2>
          <p className="text-xs text-text-muted leading-relaxed">
            Four cohesive stages optimized to align your credentials with recruiting algorithms without exaggerating details.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { step: "01", title: "Ingest Background", desc: "Paste raw resume text or upload PDF/DOCX alongside job criteria." },
            { step: "02", title: "Live Pipeline Analysis", desc: "Sequential LLM chain extracts JD features and parses experience parameters." },
            { step: "03", title: "Fabrication Audit Shield", desc: "Programmatic stubs flag tech additions and metric changes for verification." },
            { step: "04", title: "Download PDF Proofs", desc: "Export single-column ATS resume and landscape comparison ledger reports." },
          ].map((item, idx) => (
            <div key={idx} className="relative glass-panel p-5 rounded-2xl flex flex-col gap-3 text-left bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300">
              <span className="text-2xl font-black font-mono bg-gradient-to-br from-accent-primary to-accent-secondary bg-clip-text text-transparent opacity-85">
                {item.step}
              </span>
              <div className="flex flex-col gap-1">
                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">{item.title}</h4>
                <p className="text-[11px] text-text-muted leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full px-4 sm:px-0">
        {features.map((feat, idx) => {
          const Icon = feat.icon;

          return (
            <Card
              key={idx}
              className="glass-panel glass-panel-hover transition-all duration-300 rounded-2xl overflow-hidden animate-fade-in-up bg-white"
              style={{ animationDelay: `${0.1 * idx}s` }}
            >
              <CardContent className="p-6 flex gap-4 items-start">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 shrink-0">
                  <Icon className={`w-5 h-5 ${feat.color}`} />
                </div>
                <div className="flex flex-col gap-1.5 text-left">
                  <h3 className="text-sm font-bold text-text-primary tracking-wide">
                    {feat.title}
                  </h3>
                  <p className="text-xs text-text-muted leading-relaxed font-medium">
                    {feat.desc}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

