"use client";

import React from "react";
import Link from "next/link";
import { Repeat, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useTailoringStore } from "@/lib/store/tailoring-store";

export default function Navbar() {
  const router = useRouter();
  const resetRun = useTailoringStore((state) => state.resetRun);

  const handleReset = () => {
    if (confirm("Are you sure you want to reset? This will clear your job, resume and outreach progress.")) {
      resetRun();
      router.push("/discover");
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md transition-all duration-300">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Logo and Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent-primary to-accent-secondary shadow-md group-hover:scale-105 group-hover:rotate-6 transition-all duration-300">
            <Repeat className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <span
            className="text-2xl font-bold tracking-tight leading-none"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <span className="text-text-primary">Hire</span>
            <span className="bg-gradient-to-r from-accent-primary via-accent-secondary to-success bg-clip-text text-transparent">
              Loop
            </span>
          </span>
        </Link>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="hidden sm:flex text-text-muted hover:text-text-primary hover:bg-slate-100 transition-all gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reset Session
          </Button>

          <Link href="/discover">
            <Button
              size="sm"
              className="bg-accent-primary hover:bg-accent-primary/90 text-white font-medium shadow-sm hover:shadow-md transition-all"
            >
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

