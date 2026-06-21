"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useTailoringStore } from "@/lib/store/tailoring-store";
import { searchJobs } from "@/lib/api/platform-client";
import { JobRecord } from "@/lib/schemas/platform";
import { Button } from "@/components/ui/button";
import { Search, AlertCircle, MapPin, Building2, ArrowRight, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

const ALL_SOURCES = ["RemoteOK", "Naukri", "Wellfound"];

export default function DiscoverPage() {
  const router = useRouter();
  const setSelectedJob = useTailoringStore((s) => s.setSelectedJob);
  const setJDText = useTailoringStore((s) => s.setJDText);

  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [sources, setSources] = useState<string[]>(["RemoteOK"]);
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const toggleSource = (s: string) =>
    setSources((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const handleSearch = async () => {
    setError(null);
    if (!role.trim()) {
      setError("Please enter a role to search for.");
      return;
    }
    setIsLoading(true);
    setSearched(true);
    try {
      const { jobs } = await searchJobs({
        role: role.trim(),
        location: location.trim() || undefined,
        sources: sources.length ? sources : undefined,
        limit: 25,
      });
      setJobs(jobs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Job search failed.");
      setJobs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (job: JobRecord) => {
    setSelectedJob(job);
    // Seed the tailor step's JD from the job so no copy-paste is needed.
    const jd = [
      `Job Title: ${job.job_title}`,
      `Company: ${job.company}`,
      job.location ? `Location: ${job.location}` : "",
      job.experience ? `Experience: ${job.experience}` : "",
      job.skills ? `Skills / Requirements: ${job.skills}` : "",
      job.salary ? `Salary: ${job.salary}` : "",
      job.job_url ? `Source: ${job.job_url}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    setJDText(jd);
    router.push("/input");
  };

  return (
    <div className="flex-1 flex flex-col gap-6 w-full animate-fade-in-up">
      <div className="flex flex-col gap-1.5 text-center sm:text-left shrink-0 select-none">
        <h2 className="text-2xl font-bold tracking-tight text-text-primary">Discover Jobs</h2>
        <p className="text-xs text-text-muted">
          Search live listings across job boards. Pick one to tailor your resume and reach out.
        </p>
      </div>

      {/* Search form */}
      <div className="glass-panel rounded-2xl p-5 flex flex-col gap-4 bg-white border border-slate-200/80 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wide text-text-muted">Role</label>
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="e.g. python developer"
              className="h-11 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/30"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wide text-text-muted">Location (optional)</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="e.g. Bengaluru or Remote"
              className="h-11 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/30"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wide text-text-muted mr-1">Sources:</span>
          {ALL_SOURCES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleSource(s)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                sources.includes(s)
                  ? "bg-accent-primary/10 border-accent-primary/30 text-accent-primary"
                  : "bg-bg-surface border-border text-text-muted hover:border-slate-300"
              )}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSearch}
            disabled={isLoading}
            className="w-full sm:w-48 h-11 rounded-xl text-sm font-bold bg-accent-primary hover:bg-accent-primary/90 text-white shadow-sm transition-all cursor-pointer"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Searching…
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Search className="w-4 h-4" /> Search Jobs
              </span>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 text-xs font-semibold text-danger bg-danger/10 border border-danger/20 rounded-xl p-4 animate-fade-in-up">
          <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
          <p className="font-medium leading-relaxed">{error}</p>
        </div>
      )}

      {/* Results */}
      {searched && !isLoading && !error && jobs.length === 0 && (
        <div className="text-center text-sm text-text-muted py-10 select-none">
          No jobs matched. Try a broader role (e.g. a single keyword) or different sources.
        </div>
      )}

      {jobs.length > 0 && (
        <div className="flex flex-col gap-3">
          <span className="text-[11px] font-bold uppercase tracking-wide text-text-muted select-none">
            {jobs.length} result{jobs.length > 1 ? "s" : ""}
          </span>
          {jobs.map((job, idx) => (
            <div
              key={`${job.job_url}-${idx}`}
              className="group glass-panel rounded-xl p-4 bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-accent-primary shrink-0" />
                  <h3 className="text-sm font-bold text-text-primary truncate">{job.job_title}</h3>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-text-muted shrink-0">
                    {job.source}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
                  <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{job.company}</span>
                  {job.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{job.location}</span>}
                  {job.salary && <span className="font-medium text-success">{job.salary}</span>}
                </div>
                {job.skills && (
                  <p className="text-[11px] text-text-muted/80 line-clamp-1 mt-0.5">{job.skills}</p>
                )}
              </div>
              <Button
                onClick={() => handleSelect(job)}
                className="shrink-0 h-10 rounded-xl text-xs font-bold bg-accent-secondary hover:bg-accent-secondary/90 text-white px-4 cursor-pointer"
              >
                Tailor for this <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
