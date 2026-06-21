"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTailoringStore } from "@/lib/store/tailoring-store";
import { runTailoringPipeline, PipelineStage } from "@/lib/api/orchestrator";
import ResumeInput from "@/components/input/ResumeInput";
import JDInput from "@/components/input/JDInput";
import LoadingOverlay from "@/components/ui/LoadingOverlay";
import { Button } from "@/components/ui/button";
import { AlertCircle, Play } from "lucide-react";
import { cn } from "@/lib/utils";

function InputPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  
  // Store values & actions
  const storeResumeText = useTailoringStore((state) => state.resumeText);
  const storeJDText = useTailoringStore((state) => state.jdText);
  const setRunData = useTailoringStore((state) => state.setRunData);
  const setResumeText = useTailoringStore((state) => state.setResumeText);
  const setJDText = useTailoringStore((state) => state.setJDText);

  // Core state inputs
  const [resumeText, setLocalResumeText] = useState("");
  const [jdText, setLocalJDText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [extractedPreview, setExtractedPreview] = useState("");

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [pipelineStage, setPipelineStage] = useState<PipelineStage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Pre-fill local states from store on mount
  useEffect(() => {
    if (storeResumeText) {
      setLocalResumeText(storeResumeText);
    }
    if (storeJDText) {
      setLocalJDText(storeJDText);
    }
  }, [storeResumeText, storeJDText]);

  // Auto-trigger analysis if in demo mode and pre-populated
  useEffect(() => {
    if (isDemo && resumeText && jdText && !isLoading && pipelineStage === "idle") {
      const timer = setTimeout(() => {
        handleAnalyze();
      }, 1200); // 1.2s delay to allow visual populating to register
      return () => clearTimeout(timer);
    }
  }, [isDemo, resumeText, jdText]);

  // Execute live LLM pipeline
  const handleAnalyze = async () => {
    setValidationError(null);
    setError(null);

    const activeResumeText = file ? extractedPreview : resumeText;

    // EC-4.8: Block when inputs are empty or under 100 characters
    if (!activeResumeText.trim() || activeResumeText.trim().length < 100) {
      setValidationError("Please enter or upload a valid resume (minimum 100 characters).");
      return;
    }

    if (!jdText.trim() || jdText.trim().length < 100) {
      setValidationError("Please enter a valid job description (minimum 100 characters).");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Run live 6-stage sequential LLM orchestrator pipeline
      const tailoringRun = await runTailoringPipeline({
        resumeInput: { rawText: activeResumeText },
        jdText: jdText,
        onStageChange: setPipelineStage,
      });

      // 2. Persist outcome data to store
      setResumeText(activeResumeText);
      setJDText(jdText);
      setRunData(tailoringRun);

      // 3. Route to scoring dashboard
      router.push("/analyze");
    } catch (err: any) {
      console.error("Live Pipeline Error: ", err);
      setValidationError(err.message || "A pipeline failure occurred during LLM processing. Please check your Groq API key and try again.");
    } finally {
      setIsLoading(false);
      setPipelineStage("idle");
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6 w-full animate-fade-in-up">
      {/* Dynamic progress screen cover */}
      <LoadingOverlay stage={pipelineStage} isVisible={pipelineStage !== "idle"} />

      {/* Title block */}
      <div className="flex flex-col gap-1.5 text-center sm:text-left shrink-0 select-none">
        <h2 className="text-2xl font-bold tracking-tight text-text-primary">
          Ingestion Dashboard
        </h2>
        <p className="text-xs text-text-muted">
          Feed the optimizer your candidate background and the target role criteria.
        </p>
      </div>

      {/* Validation / Core Pipeline Error banner */}
      {validationError && (
        <div className="flex items-start gap-2.5 text-xs font-semibold text-danger bg-danger/10 border border-danger/20 rounded-xl p-4 shrink-0 animate-fade-in-up">
          <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-[10px] uppercase tracking-wide">
              Pipeline Execution Error
            </span>
            <p className="text-xs font-medium leading-relaxed">{validationError}</p>
          </div>
        </div>
      )}

      {/* Inputs side-by-side or stacked grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0 items-stretch">
        <div className="h-full">
          <ResumeInput
            textValue={resumeText}
            onTextChange={setLocalResumeText}
            selectedFile={file}
            onFileSelect={setFile}
            extractedPreview={extractedPreview}
            onExtractedPreviewChange={setExtractedPreview}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            error={error}
            setError={setError}
          />
        </div>

        <div className="h-full">
          <JDInput
            value={jdText}
            onChange={setLocalJDText}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Centered trigger row */}
      <div className="flex justify-center sm:justify-end shrink-0 py-2 select-none">
        <Button
          onClick={handleAnalyze}
          disabled={isLoading}
          className={cn(
            "w-full sm:w-56 h-12 rounded-xl text-sm font-bold bg-accent-primary hover:bg-accent-primary/90 text-white shadow-sm hover:shadow-md transition-all cursor-pointer",
            isLoading && "opacity-75 cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Running Live Pipeline...
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Play className="w-4 h-4 fill-current" />
              Analyze Match Score
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}

export default function InputPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex flex-col items-center justify-center py-20 text-center gap-3 select-none">
        <div className="h-6 w-6 border-2 border-accent-secondary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-text-muted">Loading Ingestion Dashboard...</span>
      </div>
    }>
      <InputPageContent />
    </Suspense>
  );
}
