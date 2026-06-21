"use client";

import React, { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalErrorPage({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to server-side telemetry or console
    console.error("Global routing boundary caught exception:", error);
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none py-16 animate-fade-in-up">
      <div className="glass-panel border border-red-200 p-8 rounded-2xl max-w-md w-full bg-white shadow-sm flex flex-col items-center gap-5">
        {/* Red Warning Badge */}
        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center border border-red-100 text-red-600">
          <AlertCircle className="w-6 h-6 animate-pulse" />
        </div>

        {/* Messaging */}
        <div className="flex flex-col gap-1.5 text-center">
          <h3 className="text-base font-bold text-text-primary">
            Application Routing Exception
          </h3>
          <p className="text-xs text-text-muted leading-relaxed">
            The router encountered a dynamic loading error or could not fetch the page assets.
          </p>
          {error.message && (
            <code className="text-[10px] text-red-800 bg-red-50/50 border border-red-100 rounded-lg p-2.5 font-mono text-left block max-h-24 overflow-y-auto mt-2 leading-relaxed select-all">
              {error.message}
            </code>
          )}
        </div>

        {/* Retry Button */}
        <Button
          onClick={reset}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl h-11 gap-1.5 cursor-pointer shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Page Load
        </Button>
      </div>
    </div>
  );
}
