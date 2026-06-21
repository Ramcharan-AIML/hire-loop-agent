"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ScoreCardProps {
  score: number;
  label: string;
  subScores?: {
    label: string;
    value: number;
  }[];
  isAfter?: boolean;
}

export default function ScoreCard({ score, label, subScores, isAfter = false }: ScoreCardProps) {
  const [displayScore, setDisplayScore] = useState(0);

  // Smooth count-up animation
  useEffect(() => {
    let start = 0;
    const end = score;
    if (start === end) {
      setDisplayScore(end);
      return;
    }

    const duration = 1200; // 1.2 seconds
    const incrementTime = Math.abs(Math.floor(duration / end));

    const timer = setInterval(() => {
      start += 1;
      setDisplayScore(start);
      if (start >= end) {
        clearInterval(timer);
        setDisplayScore(end);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [score]);

  // SVG parameters for the circular gauge
  const radius = 50;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  const colorClass = isAfter ? "text-accent-secondary" : "text-accent-primary";
  const strokeColor = isAfter ? "var(--accent-secondary)" : "var(--accent-primary)";

  return (
    <div
      className={cn(
        "glass-panel rounded-2xl p-6 flex flex-col items-center gap-6 relative overflow-hidden h-full shadow-sm hover:shadow-md transition-all border border-slate-200/80"
      )}
    >
      {/* Absolute faint background label */}
      <span className="absolute top-2 right-3 text-[10px] text-text-muted font-bold tracking-widest uppercase opacity-40">
        {isAfter ? "Tailored" : "Original"}
      </span>

      {/* SVG Circle Gauge */}
      <div className="relative w-36 h-36 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="72"
            cy="72"
            r={radius}
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <motion.circle
            cx="72"
            cy="72"
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            strokeLinecap="round"
          />
        </svg>

        {/* Floating Center Score */}
        <div className="absolute flex flex-col items-center justify-center">
          <span className={cn("text-3xl font-extrabold font-mono tracking-tight", colorClass)}>
            {displayScore}
          </span>
          <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">
            Match %
          </span>
        </div>
      </div>

      <div className="text-center">
        <h4 className="text-sm font-bold text-text-primary mb-1">{label}</h4>
      </div>

      {/* Sub-scores breakdown */}
      {subScores && subScores.length > 0 && (
        <div className="w-full flex flex-col gap-3 mt-2 border-t border-slate-100 pt-4">
          {subScores.map((sub, idx) => (
            <div key={idx} className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px] font-medium">
                <span className="text-text-muted">{sub.label}</span>
                <span className="text-text-primary font-mono">{sub.value}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  className={cn(
                    "h-full rounded-full",
                    isAfter ? "bg-accent-secondary/80" : "bg-accent-primary/80"
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${sub.value}%` }}
                  transition={{ duration: 1, delay: 0.1 * idx, ease: "easeOut" }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
