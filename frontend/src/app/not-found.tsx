"use client";

import React from "react";
import Link from "next/link";
import { HelpCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none py-20 animate-fade-in-up">
      <div className="glass-panel border border-slate-200/80 p-8 rounded-2xl max-w-md w-full bg-white shadow-sm flex flex-col items-center gap-5">
        {/* Grey Help Question Icon */}
        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-400">
          <HelpCircle className="w-6 h-6" />
        </div>

        {/* Messaging */}
        <div className="flex flex-col gap-1.5 text-center">
          <h3 className="text-base font-bold text-text-primary">
            404 — Page Not Found
          </h3>
          <p className="text-xs text-text-muted leading-relaxed">
            The resource you requested does not exist or has been shifted. Check the URL or start a new resume tailoring session.
          </p>
        </div>

        {/* Home CTA Button */}
        <Link href="/" className="w-full">
          <Button
            className="w-full bg-accent-primary hover:bg-accent-primary/90 text-white font-bold rounded-xl h-11 gap-1.5 cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Landing
          </Button>
        </Link>
      </div>
    </div>
  );
}
