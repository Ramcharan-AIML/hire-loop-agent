"use client";

import React from "react";
import { Briefcase, Folder } from "lucide-react";
import { TailoredResume } from "@/lib/schemas/tailored-resume";
import BulletComparison from "./BulletComparison";

interface SideBySideDiffProps {
  tailoredResume: TailoredResume;
}

export default function SideBySideDiff({ tailoredResume }: SideBySideDiffProps) {
  return (
    <div className="w-full flex flex-col gap-8">
      {/* Experience Section */}
      <div className="flex flex-col gap-6">
        <h3 className="text-base font-bold text-text-primary flex items-center gap-2 border-b border-slate-200 pb-2 shrink-0 select-none">
          <Briefcase className="w-4.5 h-4.5 text-accent-primary" />
          Work Experience Bullets
        </h3>

        {tailoredResume.tailoredExperience.map((exp, expIdx) => (
          <div key={expIdx} className="flex flex-col gap-4 animate-fade-in-up">
            {/* Experience title header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div>
                <h4 className="text-sm font-bold text-text-primary">
                  {exp.title}
                </h4>
                <span className="text-xs text-text-muted font-medium">
                  {exp.company} {exp.location ? `· ${exp.location}` : ""}
                </span>
              </div>
              <span className="text-xs text-accent-secondary font-bold font-mono">
                {exp.startDate} – {exp.endDate}
              </span>
            </div>

            {/* Bullets comparison stack */}
            <div className="flex flex-col gap-3 pl-0 sm:pl-4">
              {exp.bullets.map((bullet, bulletIdx) => (
                <BulletComparison key={bulletIdx} bullet={bullet} expIdx={expIdx} bulletIdx={bulletIdx} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Projects Section */}
      {tailoredResume.tailoredProjects && tailoredResume.tailoredProjects.length > 0 && (
        <div className="flex flex-col gap-6 mt-4">
          <h3 className="text-base font-bold text-text-primary flex items-center gap-2 border-b border-slate-200 pb-2 shrink-0 select-none">
            <Folder className="w-4.5 h-4.5 text-accent-secondary" />
            Project Bullets
          </h3>

          {tailoredResume.tailoredProjects.map((proj, projIdx) => (
            <div key={projIdx} className="flex flex-col gap-4 animate-fade-in-up">
              {/* Project title header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div>
                  <h4 className="text-sm font-bold text-text-primary">
                    {proj.name}
                  </h4>
                  {proj.description && (
                    <span className="text-xs text-text-muted">
                      {proj.description}
                    </span>
                  )}
                </div>
                {proj.technologies && proj.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 max-w-sm justify-end">
                    {proj.technologies.map((t, idx) => (
                      <span
                        key={idx}
                        className="text-[9px] font-bold font-mono uppercase bg-slate-100/80 text-text-muted px-2 py-0.5 rounded border border-slate-200"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Bullets comparison stack */}
              <div className="flex flex-col gap-3 pl-0 sm:pl-4">
                {proj.bullets.map((bullet, bulletIdx) => (
                  <BulletComparison key={bulletIdx} bullet={bullet} projIdx={projIdx} bulletIdx={bulletIdx} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
