import React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded bg-slate-200/80 dark:bg-slate-800", className)}
      {...props}
    />
  );
}

export default function SkeletonCard() {
  return (
    <div className="glass-panel border border-slate-200/80 p-6 rounded-2xl bg-white shadow-sm flex flex-col gap-4 w-full">
      {/* Card Header Shimmer */}
      <div className="flex gap-4 items-center">
        <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
        <div className="flex flex-col gap-2 flex-1">
          <Skeleton className="h-4.5 w-1/3 rounded" />
          <Skeleton className="h-3 w-1/2 rounded" />
        </div>
      </div>

      <hr className="border-slate-100 my-1" />

      {/* Card Content Shimmer */}
      <div className="flex flex-col gap-2.5">
        <Skeleton className="h-3 w-full rounded" />
        <Skeleton className="h-3 w-5/6 rounded" />
        <Skeleton className="h-3 w-4/5 rounded" />
      </div>

      {/* Card Footer Shimmer */}
      <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-50">
        <Skeleton className="h-3 w-1/4 rounded" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
    </div>
  );
}
