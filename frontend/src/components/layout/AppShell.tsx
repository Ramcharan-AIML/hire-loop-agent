"use client";

import React from "react";
import Navbar from "./Navbar";
import StepIndicator from "./StepIndicator";
import { Sparkles } from "lucide-react";

import ErrorBoundary from "../ui/ErrorBoundary";

interface AppShellProps {
  children: React.ReactNode;
}
export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="relative min-h-screen flex flex-col overflow-x-hidden bg-[#f8fafc]">
      {/* Header Navigation */}
      <Navbar />

      {/* Main Workflow Container */}
      <main className="flex-1 w-full flex flex-col z-10">
        <div className="container mx-auto px-4 sm:px-6 py-6 max-w-7xl flex-1 flex flex-col">
          {/* Step stepper is automatically displayed on relevant routes */}
          <StepIndicator />

          {/* Page content */}
          <div className="flex-1 flex flex-col animate-fade-in-up">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </div>
        </div>
      </main>


      {/* Footer */}
      <footer className="border-t border-slate-100 bg-white py-6 z-10 relative">
        <div className="container mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-muted">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-accent-secondary" />
            <span>Resume Shapeshifter · Professional Engine</span>
          </div>
          <div>
            <span>© {new Date().getFullYear()} Resume Shapeshifter. Factual Integrity Engine.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
