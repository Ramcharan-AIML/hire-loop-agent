"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardCheck, Sparkles, Hammer } from "lucide-react";
import { JobDescriptionProfile } from "@/lib/schemas/job-description";

interface JDSummaryCardProps {
  jd: JobDescriptionProfile;
}

export default function JDSummaryCard({ jd }: JDSummaryCardProps) {
  const hasSkills = jd.requiredSkills.length > 0 || jd.preferredSkills.length > 0 || jd.tools.length > 0;

  return (
    <Card className="glass-panel shadow-sm hover:shadow-md transition-all h-full flex flex-col">
      <CardHeader className="pb-3 shrink-0">
        <CardTitle className="text-base font-bold flex items-center gap-2 text-text-primary">
          <ClipboardCheck className="h-4.5 w-4.5 text-accent-secondary" />
          Extracted JD Requirements
        </CardTitle>
        <CardDescription className="text-text-muted text-xs">
          Role profile and key technologies extracted from target job description.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4 overflow-y-auto min-h-0">
        {/* Meta data */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs py-2 border-b border-slate-200">
          <div>
            <span className="text-text-muted font-medium">Job Title:</span>{" "}
            <span className="text-text-primary font-bold">{jd.jobTitle}</span>
          </div>
          {jd.company && (
            <div>
              <span className="text-text-muted font-medium">Company:</span>{" "}
              <span className="text-text-primary font-bold">{jd.company}</span>
            </div>
          )}
          <div>
            <span className="text-text-muted font-medium">Seniority:</span>{" "}
            <Badge variant="outline" className="ml-1 border-accent-secondary/30 text-accent-secondary bg-accent-secondary/5 font-semibold text-[10px] capitalize">
              {jd.seniorityLevel}
            </Badge>
          </div>
        </div>

        {!hasSkills ? (
          // EC-6.7: Empty tag chips area fallback
          <div className="flex-1 flex items-center justify-center py-8 text-center text-xs text-text-muted select-none">
            No specific required skills or tools were extracted. Paste a more detailed job description for richer matching tags.
          </div>
        ) : (
          <div className="flex flex-col gap-4 flex-1">
            {/* Required Skills */}
            {jd.requiredSkills.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-accent-primary uppercase tracking-widest flex items-center gap-1 select-none">
                  <Sparkles className="w-3 h-3 text-accent-primary" />
                  Required Expertise
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {jd.requiredSkills.map((skill, idx) => (
                    <Badge
                      key={idx}
                      className="bg-accent-primary/10 hover:bg-accent-primary/15 text-text-primary border border-accent-primary/15 rounded-md px-2 py-0.5 text-xs font-semibold"
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Preferred Skills */}
            {jd.preferredSkills.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-accent-secondary uppercase tracking-widest flex items-center gap-1 select-none">
                  <Sparkles className="w-3 h-3 text-accent-secondary" />
                  Preferred/Bonus Skills
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {jd.preferredSkills.map((skill, idx) => (
                    <Badge
                      key={idx}
                      className="bg-accent-secondary/10 hover:bg-accent-secondary/15 text-text-primary border border-accent-secondary/15 rounded-md px-2 py-0.5 text-xs font-semibold"
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Tools & Utilities */}
            {jd.tools.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-1 select-none">
                  <Hammer className="w-3 h-3 text-text-muted" />
                  Target Tools & Infrastructure
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {jd.tools.map((tool, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="border-slate-200 hover:bg-slate-50 text-text-muted rounded-md px-2 py-0.5 text-xs font-medium bg-slate-50/50"
                    >
                      {tool}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
