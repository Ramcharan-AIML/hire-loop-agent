# PROMPT 2 — The Recruiter Lens Agent (Cover Letter + Cold Email)

## ⚠️ CRITICAL — READ THIS FIRST (DO NOT SKIP)

**This prompt is fully self-contained. Everything you need is in this prompt. Do not look anywhere else.**

**Strict scope rules — you MUST follow all of these:**

1. Work ONLY inside the CURRENT directory. The Resume Shapeshifter project from Prompt 1 is already here.
2. Do NOT read, list, glob, or inspect any SIBLING, PARENT, or OTHER directory on the user's machine — even if those directories have similar names like "resume_builder_4", "shapeshifter_old", "resume_builder_5", etc.
3. Do NOT look for API keys, `.env` files, or configuration in any other project. The user's API keys are already in THIS project's `.env.local`. Do NOT touch `.env.local` in this prompt.
4. Within this directory, you MAY read existing files from Prompt 1 to understand the project state. But ONLY this directory.
5. Create the NEW files listed below and REPLACE the MODIFIED files exactly as specified — character-for-character.
6. Do NOT modify anything outside this directory.

**DO NOT run, test, or verify the project after building. Specifically:**

7. After all files are created/replaced, your job is done. Do NOT run any commands — no new `npm install` is needed in this prompt.
8. Do NOT run `npm run dev`. Do NOT run `npm run build`. Do NOT run `npx tsc`. Do NOT run `npm run lint`. Do NOT restart any dev server.
9. Do NOT open a browser. Do NOT make HTTP requests. Do NOT use `curl`, `fetch`, Playwright, Puppeteer, or any browser automation tool.
10. Do NOT take screenshots. Do NOT poll endpoints. Do NOT monitor logs. Do NOT test any endpoint.
11. Do NOT loop to "fix" any imagined error. After files are written, output one short message: `"Prompt 2 files written. User should restart npm run dev to test."` Then end your turn.

If any step fails, STOP and report. Do NOT improvise by looking in other folders or running alternative commands.

---

Continue building the **Resume Shapeshifter** project. Prompt 1 is complete: the user can paste a resume + JD, get a tailored result, and download a clean resume PDF. The result persists in localStorage.

In this prompt you will add a **Recruiter Lens Agent** — a real Groq tool-calling agent that:
1. Drafts a cover letter and a cold outreach email.
2. Reviews them with a "recruiter lens" — a deterministic checker that catches AI-tells, length issues, and missing personalization.
3. If anything would make a recruiter skip the application, the agent rewrites and re-checks (up to 2 iterations).
4. Returns both artifacts as copy-to-clipboard text cards on the same results page.

This uses the same `GROQ_API_KEY` from Prompt 1 — no new key needed. The mock interview in Prompt 3 will use a separate Gemini key.

Create every file EXACTLY as shown. Light theme. The IDE just copies files.

---

## BEFORE YOU START — DELETE OLD FILES (if they exist)

If you previously ran an earlier version of Prompt 2 that built a Score-Climbing Agent, delete these files first. They are no longer used:

- `src/lib/agent.ts`
- `src/lib/fabrication-checker.ts`
- `src/app/api/optimize/route.ts`
- `src/app/optimize/` (the entire folder)

If those files don't exist, skip this step.

---

## WHAT YOU WILL CREATE / MODIFY

### NEW files (3):
- `src/lib/kit-quality-checker.ts`
- `src/lib/kit-agent.ts`
- `src/app/api/generate-kit/route.ts`

### MODIFIED files (3):
- `src/lib/schema.ts` (add `ApplicationKitSchema`)
- `src/lib/store.ts` (add persisted `applicationKit` field)
- `src/app/page.tsx` (REPLACE entirely — adds the kit section)

---

## NEW FILES

### File: `src/lib/kit-quality-checker.ts`

```typescript
const AI_TELL_PHRASES: readonly string[] = [
  "i am writing to express",
  "i am writing to apply",
  "i am thrilled",
  "i am excited to apply",
  "i am delighted",
  "i'm thrilled to apply",
  "leverage",
  "leveraging",
  "synergy",
  "synergies",
  "moreover",
  "furthermore",
  "as evidenced by",
  "in conclusion",
  "with that said",
  "i hope this email finds you well",
  "i hope this finds you well",
  "i came across your job",
  "i recently came across",
  "enclosed please find",
  "elated",
  "dive deep",
  "dive deeper",
  "spearheaded",
  "tapestry",
  "delve",
];

const GENERIC_OPENERS: readonly string[] = [
  "i hope this email finds you well",
  "i hope this finds you well",
  "i came across your job",
  "i am writing to apply",
  "i am writing to express",
  "i'm reaching out because",
  "i recently came across",
];

const EMPTY_PLATITUDES: readonly string[] = [
  "passionate",
  "thrilled",
  "excited",
  "delighted",
  "amazing",
  "incredible",
  "fantastic",
];

export interface KitQualityIssue {
  field: "coverLetter" | "coldEmail";
  message: string;
}

export interface KitQualityResult {
  passed: boolean;
  issues: KitQualityIssue[];
  score: number;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function countMatches(text: string, phrase: string): number {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\b${escaped}\\b`, "gi");
  const matches = text.match(re);
  return matches ? matches.length : 0;
}

export function checkKitQuality(input: {
  coverLetter: { subject: string; body: string };
  coldEmail: { subject: string; body: string };
  companyName: string;
  jobTitle: string;
}): KitQualityResult {
  const issues: KitQualityIssue[] = [];
  const company = (input.companyName || "").trim();

  const cl = input.coverLetter.body;
  const clLower = cl.toLowerCase();
  const clWords = countWords(cl);

  if (clWords < 180) {
    issues.push({
      field: "coverLetter",
      message: `Cover letter is ${clWords} words — too short (target 200–280)`,
    });
  } else if (clWords > 310) {
    issues.push({
      field: "coverLetter",
      message: `Cover letter is ${clWords} words — too long for a recruiter scan (target 200–280)`,
    });
  }

  for (const phrase of AI_TELL_PHRASES) {
    if (clLower.includes(phrase)) {
      issues.push({
        field: "coverLetter",
        message: `AI-tell phrase: "${phrase}"`,
      });
    }
  }

  if (company.length > 0 && !clLower.includes(company.toLowerCase())) {
    issues.push({
      field: "coverLetter",
      message: `Company name "${company}" not mentioned — not personalized enough`,
    });
  }

  const clEmDashes = (cl.match(/—/g) || []).length;
  if (clEmDashes > 3) {
    issues.push({
      field: "coverLetter",
      message: `${clEmDashes} em-dashes — overuse signals AI`,
    });
  }

  let platitudeCount = 0;
  for (const p of EMPTY_PLATITUDES) {
    platitudeCount += countMatches(cl, p);
  }
  if (platitudeCount > 2) {
    issues.push({
      field: "coverLetter",
      message: `${platitudeCount} empty platitudes (passionate, thrilled, excited) — recruiters tune out`,
    });
  }

  const clOpener = clLower.slice(0, 100);
  for (const opener of GENERIC_OPENERS) {
    if (clOpener.includes(opener)) {
      issues.push({
        field: "coverLetter",
        message: `Generic opener: "${opener}" — recruiters skip these`,
      });
      break;
    }
  }

  const ce = input.coldEmail.body;
  const ceLower = ce.toLowerCase();
  const ceWords = countWords(ce);

  if (ceWords < 70) {
    issues.push({
      field: "coldEmail",
      message: `Cold email is ${ceWords} words — too short (target 80–130)`,
    });
  } else if (ceWords > 150) {
    issues.push({
      field: "coldEmail",
      message: `Cold email is ${ceWords} words — too long for a cold outreach (target 80–130)`,
    });
  }

  for (const phrase of AI_TELL_PHRASES) {
    if (ceLower.includes(phrase)) {
      issues.push({
        field: "coldEmail",
        message: `AI-tell phrase in cold email: "${phrase}"`,
      });
    }
  }

  if (company.length > 0 && !ceLower.includes(company.toLowerCase())) {
    issues.push({
      field: "coldEmail",
      message: `Cold email doesn't mention "${company}"`,
    });
  }

  const ceOpener = ceLower.slice(0, 100);
  for (const opener of GENERIC_OPENERS) {
    if (ceOpener.includes(opener)) {
      issues.push({
        field: "coldEmail",
        message: `Cold email opens with generic phrase: "${opener}"`,
      });
      break;
    }
  }

  const score = Math.max(0, Math.min(100, 100 - issues.length * 9));
  const passed = issues.length === 0;
  return { passed, issues, score };
}
```

### File: `src/lib/kit-agent.ts`

```typescript
import Groq from "groq-sdk";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "groq-sdk/resources/chat/completions";
import type { TailoringResult, ApplicationKit, AgentLogEntry } from "./schema";
import { checkKitQuality } from "./kit-quality-checker";

const MAX_ITERATIONS = 2;

const KIT_SYSTEM_PROMPT = `You are a career coach who writes cover letters and cold outreach emails that sound like a HUMAN wrote them — never like AI. You work in iterations:

PHASE 1 — DRAFT:
Write a personalized cover letter and a recruiter cold email based on the candidate's resume and the target job description. Use the draft_application_kit tool to submit them.

PHASE 2 — REFINE IF NEEDED:
A recruiter-lens quality checker will scan your drafts. If it flags issues, you'll get a list of specific problems. Rewrite the drafts to fix every single issue, then call draft_application_kit again.

WRITING RULES (CRITICAL — these are recruiter-trained):
1. Cover letter: 200–280 words. Cold email: 80–130 words. STRICT length limits.
2. NEVER use these phrases (they scream AI):
   - "I am writing to express..."
   - "I am thrilled to apply..."
   - "leverage", "synergy", "moreover", "furthermore"
   - "as evidenced by", "in conclusion", "with that said"
   - "I hope this email finds you well"
   - "I came across your job posting"
   - "delve", "tapestry", "dive deep"
   - "enclosed please find"
3. Use contractions (I'm, I've, won't, can't) — humans use them.
4. Mention the company name AT LEAST TWICE in the cover letter, AT LEAST ONCE in the cold email.
5. Open with a SPECIFIC hook — a detail from the job description or a result from the candidate's resume. Never a generic greeting.
6. Reference ONE specific project, employer, or experience from the candidate's actual resume.
7. Use varied sentence rhythm. Short sentences. Then longer ones. Mix it up.
8. Max 3 em-dashes per document.
9. Don't overuse "passionate", "thrilled", "excited". One is fine, three is robotic.
10. End with a direct, specific ask — a 15-minute call, an interview slot, a portfolio review. Not "thank you for your consideration".

NEVER invent skills, employers, technologies, or credentials not in the candidate's resume.

When you draft, use the draft_application_kit tool with:
- coverLetter.subject: the email subject line (e.g., "Frontend Developer role — Ramcharan Yachamaneni")
- coverLetter.body: the full cover letter text
- coldEmail.subject: a snappy cold-outreach subject line
- coldEmail.body: the cold email text

After 2 iterations max, you must finalize.`;

const DRAFT_KIT_TOOL: ChatCompletionTool = {
  type: "function",
  function: {
    name: "draft_application_kit",
    description:
      "Submit your drafted cover letter and cold email. The system will run a recruiter-lens quality check and respond with either 'passed' (finalize) or a list of issues (rewrite both).",
    parameters: {
      type: "object",
      properties: {
        coverLetter: {
          type: "object",
          properties: {
            subject: {
              type: "string",
              description:
                "Email subject line for sending the cover letter. Keep it specific and direct, e.g. 'Frontend Developer role — Your Name'.",
            },
            body: {
              type: "string",
              description:
                "The cover letter body. 200–280 words. Must NOT contain banned AI-tell phrases.",
            },
          },
          required: ["subject", "body"],
        },
        coldEmail: {
          type: "object",
          properties: {
            subject: {
              type: "string",
              description:
                "Cold-outreach subject line. Snappy, specific, under 60 chars.",
            },
            body: {
              type: "string",
              description: "The cold email body. 80–130 words.",
            },
          },
          required: ["subject", "body"],
        },
      },
      required: ["coverLetter", "coldEmail"],
    },
  },
};

function buildContextSummary(
  tailoring: TailoringResult,
  resumeText: string,
  jdText: string
): string {
  const projectsLine = tailoring.projects
    .slice(0, 3)
    .map((p) => `- ${p.name} (${p.techStack})`)
    .join("\n");
  const skillsLine = tailoring.skills
    .map((s) => `${s.category}: ${s.items.slice(0, 6).join(", ")}`)
    .join("\n");

  return [
    "## CANDIDATE",
    `Name: ${tailoring.candidate.name}`,
    `Profile: ${tailoring.candidate.profile}`,
    "",
    "## RELEVANT PROJECTS",
    projectsLine || "(none parsed)",
    "",
    "## SKILLS",
    skillsLine || "(none parsed)",
    "",
    "## TARGET ROLE",
    `Title: ${tailoring.jdSummary.jobTitle}`,
    `Company: ${tailoring.jdSummary.company || "(not specified — use 'your team' or a sensible fallback)"}`,
    `Required: ${tailoring.jdSummary.requiredSkills.slice(0, 8).join(", ")}`,
    `Preferred: ${tailoring.jdSummary.preferredSkills.slice(0, 6).join(", ")}`,
    "",
    "## FULL JOB DESCRIPTION (for context, find ONE specific detail to reference)",
    jdText.trim().slice(0, 1500),
    "",
    "## CANDIDATE'S ORIGINAL RESUME (source of truth — never invent beyond this)",
    resumeText.trim().slice(0, 2000),
    "",
    "Now draft the cover letter and cold email and submit them via the draft_application_kit tool.",
  ].join("\n");
}

export async function generateApplicationKit(input: {
  tailoringResult: TailoringResult;
  resumeText: string;
  jdText: string;
}): Promise<ApplicationKit> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is missing in .env.local");
  }

  const model = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
  const groq = new Groq({ apiKey });

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: KIT_SYSTEM_PROMPT },
    {
      role: "user",
      content: buildContextSummary(
        input.tailoringResult,
        input.resumeText,
        input.jdText
      ),
    },
  ];

  const agentLog: AgentLogEntry[] = [
    {
      kind: "info",
      icon: "✨",
      message: "Drafting your cover letter and cold email…",
    },
  ];

  let currentKit: {
    coverLetter: { subject: string; body: string };
    coldEmail: { subject: string; body: string };
  } | null = null;
  let finalScore = 0;

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    const response = await groq.chat.completions.create({
      model,
      messages,
      tools: [DRAFT_KIT_TOOL],
      tool_choice: {
        type: "function",
        function: { name: "draft_application_kit" },
      },
      temperature: 0.75,
      max_tokens: 2500,
    });

    const msg = response.choices?.[0]?.message;
    const tc = msg?.tool_calls?.[0];
    if (!tc || tc.function.name !== "draft_application_kit") {
      throw new Error("Agent failed to call draft_application_kit");
    }

    let args: {
      coverLetter?: { subject?: string; body?: string };
      coldEmail?: { subject?: string; body?: string };
    };
    try {
      args = JSON.parse(tc.function.arguments);
    } catch {
      throw new Error("Agent tool args were not valid JSON");
    }

    const cl = args.coverLetter;
    const ce = args.coldEmail;
    if (
      !cl ||
      typeof cl.subject !== "string" ||
      typeof cl.body !== "string" ||
      !ce ||
      typeof ce.subject !== "string" ||
      typeof ce.body !== "string"
    ) {
      throw new Error("Agent draft was missing required fields");
    }

    currentKit = {
      coverLetter: { subject: cl.subject, body: cl.body },
      coldEmail: { subject: ce.subject, body: ce.body },
    };

    if (iter === 0) {
      agentLog.push({
        kind: "info",
        icon: "👀",
        message:
          "Putting on the recruiter lens… reviewing as if I'm screening 200 applications today",
      });
    } else {
      agentLog.push({
        kind: "info",
        icon: "🔧",
        message:
          "Refining the drafts based on what would make a recruiter hit 'next'…",
      });
      agentLog.push({
        kind: "info",
        icon: "👀",
        message: "Putting the new drafts under the recruiter lens again…",
      });
    }

    const quality = checkKitQuality({
      coverLetter: currentKit.coverLetter,
      coldEmail: currentKit.coldEmail,
      companyName: input.tailoringResult.jdSummary.company,
      jobTitle: input.tailoringResult.jdSummary.jobTitle,
    });

    finalScore = quality.score;

    if (quality.passed) {
      agentLog.push({
        kind: "success",
        icon: "✅",
        message: "Pass: sounds human, right length, personalized, no AI-tells",
      });
      agentLog.push({
        kind: "success",
        icon: "📨",
        message: `Application kit ready (Quality score: ${quality.score}/100)`,
      });
      break;
    }

    for (const issue of quality.issues.slice(0, 6)) {
      agentLog.push({
        kind: "warning",
        message: `${issue.field === "coverLetter" ? "Cover letter" : "Cold email"} — ${issue.message}`,
      });
    }

    if (iter === MAX_ITERATIONS - 1) {
      agentLog.push({
        kind: "success",
        icon: "📨",
        message: `Application kit finalized (Quality score: ${quality.score}/100)`,
      });
      break;
    }

    messages.push({
      role: "assistant",
      content: msg?.content ?? "",
      tool_calls: msg?.tool_calls,
    });
    messages.push({
      role: "tool",
      tool_call_id: tc.id,
      content: JSON.stringify({
        passed: false,
        score: quality.score,
        issues: quality.issues.map(
          (i) =>
            `${i.field === "coverLetter" ? "Cover letter" : "Cold email"}: ${i.message}`
        ),
        instruction:
          "Rewrite BOTH the cover letter and the cold email, addressing every issue above. Use the draft_application_kit tool again.",
      }),
    });
  }

  if (!currentKit) {
    throw new Error("Agent loop ended without producing a kit");
  }

  return {
    coverLetter: currentKit.coverLetter,
    coldEmail: currentKit.coldEmail,
    qualityScore: finalScore,
    agentLog,
  };
}
```

### File: `src/app/api/generate-kit/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { generateApplicationKit } from "@/lib/kit-agent";
import { TailoringResultSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

interface KitBody {
  tailoringResult?: unknown;
  resumeText?: unknown;
  jdText?: unknown;
}

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      {
        success: false,
        error: "GROQ_API_KEY is missing in .env.local",
      },
      { status: 400 }
    );
  }

  let body: KitBody;
  try {
    body = (await req.json()) as KitBody;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const parsed = TailoringResultSchema.safeParse(body.tailoringResult);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid tailoring result in body." },
      { status: 400 }
    );
  }

  const resumeText =
    typeof body.resumeText === "string" ? body.resumeText : "";
  const jdText = typeof body.jdText === "string" ? body.jdText : "";

  if (resumeText.trim().length < 50 || jdText.trim().length < 50) {
    return NextResponse.json(
      {
        success: false,
        error: "Resume and job description are required.",
      },
      { status: 400 }
    );
  }

  try {
    const kit = await generateApplicationKit({
      tailoringResult: parsed.data,
      resumeText,
      jdText,
    });
    return NextResponse.json({ success: true, data: kit });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Kit generation failed.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
```

---

## MODIFIED FILES

### File: `src/lib/schema.ts` — REPLACE entire contents

```typescript
import { z } from "zod";

export const TailoringResultSchema = z.object({
  score: z.object({
    original: z.number().int().min(0).max(100),
    tailored: z.number().int().min(0).max(100),
    explanation: z.string().min(10),
  }),
  jdSummary: z.object({
    jobTitle: z.string().min(1),
    company: z.string().default(""),
    requiredSkills: z.array(z.string()).default([]),
    preferredSkills: z.array(z.string()).default([]),
  }),
  candidate: z.object({
    name: z.string().min(1),
    location: z.string().default(""),
    phone: z.string().default(""),
    email: z.string().default(""),
    profile: z.string().min(20),
  }),
  education: z
    .array(
      z.object({
        institution: z.string().min(1),
        degree: z.string().min(1),
        dates: z.string().default(""),
        location: z.string().default(""),
      })
    )
    .default([]),
  projects: z
    .array(
      z.object({
        name: z.string().min(1),
        techStack: z.string().default(""),
        bullets: z.array(z.string().min(1)).min(1),
      })
    )
    .default([]),
  skills: z
    .array(
      z.object({
        category: z.string().min(1),
        items: z.array(z.string().min(1)).min(1),
      })
    )
    .default([]),
  certifications: z.array(z.string().min(1)).default([]),
  tailoredBullets: z
    .array(
      z.object({
        original: z.string().min(1),
        tailored: z.string().min(1),
        changeReason: z.string().min(1),
        confidence: z.enum(["high", "medium", "low"]),
      })
    )
    .min(1)
    .max(8),
  gaps: z
    .array(
      z.object({
        name: z.string().min(1),
        importance: z.enum(["high", "medium", "low"]),
        suggestedAction: z.string().min(1),
      })
    )
    .max(6),
});

export type TailoringResult = z.infer<typeof TailoringResultSchema>;

export const AgentLogEntrySchema = z.object({
  kind: z.enum(["info", "warning", "success"]),
  icon: z.string().optional(),
  message: z.string(),
});

export type AgentLogEntry = z.infer<typeof AgentLogEntrySchema>;

export const ApplicationKitSchema = z.object({
  coverLetter: z.object({
    subject: z.string().min(3),
    body: z.string().min(50),
  }),
  coldEmail: z.object({
    subject: z.string().min(3),
    body: z.string().min(30),
  }),
  qualityScore: z.number().int().min(0).max(100),
  agentLog: z.array(AgentLogEntrySchema),
});

export type ApplicationKit = z.infer<typeof ApplicationKitSchema>;
```

### File: `src/lib/store.ts` — REPLACE entire contents

```typescript
"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ApplicationKit, TailoringResult } from "./schema";

interface ShapeshifterStore {
  result: TailoringResult | null;
  resumeText: string;
  jdText: string;
  applicationKit: ApplicationKit | null;
  setResult: (
    result: TailoringResult,
    resumeText: string,
    jdText: string
  ) => void;
  setApplicationKit: (kit: ApplicationKit | null) => void;
  clear: () => void;
}

export const useShapeshifterStore = create<ShapeshifterStore>()(
  persist(
    (set) => ({
      result: null,
      resumeText: "",
      jdText: "",
      applicationKit: null,
      setResult: (result, resumeText, jdText) =>
        set({ result, resumeText, jdText, applicationKit: null }),
      setApplicationKit: (kit) => set({ applicationKit: kit }),
      clear: () =>
        set({
          result: null,
          resumeText: "",
          jdText: "",
          applicationKit: null,
        }),
    }),
    {
      name: "resume-shapeshifter",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        result: state.result,
        resumeText: state.resumeText,
        jdText: state.jdText,
        applicationKit: state.applicationKit,
      }),
    }
  )
);

export function useHasHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const unsub = useShapeshifterStore.persist.onFinishHydration(() =>
      setHydrated(true)
    );
    if (useShapeshifterStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return () => {
      unsub();
    };
  }, []);
  return hydrated;
}
```

### File: `src/app/page.tsx` — REPLACE entire contents

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Loader2,
  RotateCcw,
  Sparkles,
  Download,
  Mail,
  Send,
  Copy,
  Check,
  Eye,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { useHasHydrated, useShapeshifterStore } from "@/lib/store";
import type {
  AgentLogEntry,
  ApplicationKit,
  TailoringResult,
} from "@/lib/schema";

type UiState = "input" | "loading" | "results" | "error";

const confidenceColors: Record<"high" | "medium" | "low", string> = {
  high: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-rose-100 text-rose-700",
};

const importanceDot: Record<"high" | "medium" | "low", string> = {
  high: "bg-rose-500",
  medium: "bg-amber-500",
  low: "bg-sky-500",
};

export default function Page() {
  const hydrated = useHasHydrated();
  const {
    result,
    resumeText,
    jdText,
    applicationKit,
    setResult,
    setApplicationKit,
    clear,
  } = useShapeshifterStore();

  const [uiState, setUiState] = useState<UiState>("input");
  const [resumeInput, setResumeInput] = useState("");
  const [jdInput, setJdInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const [kitGenerating, setKitGenerating] = useState(false);
  const [kitError, setKitError] = useState<string | null>(null);
  const [revealedCount, setRevealedCount] = useState(0);
  const [showCards, setShowCards] = useState(false);
  const justGeneratedRef = useRef(false);

  useEffect(() => {
    if (!hydrated) return;
    if (result) {
      setUiState("results");
    } else {
      setResumeInput(resumeText);
      setJdInput(jdText);
    }
  }, [hydrated, result, resumeText, jdText]);

  useEffect(() => {
    if (!applicationKit) {
      setRevealedCount(0);
      setShowCards(false);
      return;
    }
    if (!justGeneratedRef.current) {
      setRevealedCount(applicationKit.agentLog.length);
      setShowCards(true);
      return;
    }
    setRevealedCount(0);
    setShowCards(false);
    let count = 0;
    const timer = setInterval(() => {
      count++;
      if (count <= applicationKit.agentLog.length) {
        setRevealedCount(count);
      } else {
        clearInterval(timer);
        setTimeout(() => {
          setShowCards(true);
          justGeneratedRef.current = false;
        }, 500);
      }
    }, 750);
    return () => clearInterval(timer);
  }, [applicationKit]);

  if (!hydrated) {
    return <div className="min-h-screen" />;
  }

  const canAnalyze =
    resumeInput.trim().length >= 50 && jdInput.trim().length >= 50;

  async function handleAnalyze() {
    setError(null);
    setUiState("loading");
    try {
      const res = await fetch("/api/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: resumeInput.trim(),
          jdText: jdInput.trim(),
        }),
      });
      const json = (await res.json()) as
        | { success: true; data: TailoringResult }
        | { success: false; error: string };
      if (!json.success) {
        setError(json.error);
        setUiState("error");
        return;
      }
      setResult(json.data, resumeInput.trim(), jdInput.trim());
      setUiState("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setUiState("error");
    }
  }

  async function handleDownload() {
    if (!result) return;
    setDownloading(true);
    try {
      const res = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result, resumeText }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(j?.error ?? "PDF generation failed.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Tailored_Resume.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  async function handleGenerateKit() {
    if (!result) return;
    setKitError(null);
    setKitGenerating(true);
    justGeneratedRef.current = true;
    try {
      const res = await fetch("/api/generate-kit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tailoringResult: result,
          resumeText,
          jdText,
        }),
      });
      const json = (await res.json()) as
        | { success: true; data: ApplicationKit }
        | { success: false; error: string };
      if (!json.success) {
        setKitError(json.error);
        justGeneratedRef.current = false;
        return;
      }
      setApplicationKit(json.data);
    } catch (err) {
      setKitError(
        err instanceof Error ? err.message : "Kit generation failed."
      );
      justGeneratedRef.current = false;
    } finally {
      setKitGenerating(false);
    }
  }

  function handleRegenerateKit() {
    setApplicationKit(null);
    setTimeout(handleGenerateKit, 100);
  }

  function handleStartOver() {
    clear();
    setResumeInput("");
    setJdInput("");
    setError(null);
    setKitError(null);
    setUiState("input");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-indigo-600" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Resume Shapeshifter
          </h1>
        </div>
        {uiState === "results" && (
          <button
            onClick={handleStartOver}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <RotateCcw className="h-4 w-4" /> Start Over
          </button>
        )}
      </header>

      <p className="mt-1 text-sm text-slate-500">
        Powered by Groq + Llama 3.3 70B. Get a free key at{" "}
        <a
          href="https://console.groq.com/keys"
          target="_blank"
          rel="noreferrer"
          className="text-indigo-600 hover:underline"
        >
          console.groq.com/keys
        </a>
      </p>

      {uiState === "input" && (
        <section className="mt-10 fade-in">
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-slate-700">
                Paste your resume
              </label>
              <textarea
                value={resumeInput}
                onChange={(e) => setResumeInput(e.target.value)}
                rows={14}
                placeholder="Name, contact info, experience bullets, projects, skills…"
                className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">
                Paste the job description
              </label>
              <textarea
                value={jdInput}
                onChange={(e) => setJdInput(e.target.value)}
                rows={14}
                placeholder="Job title, company, requirements, responsibilities…"
                className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              />
            </div>
          </div>
          <div className="mt-8 flex justify-center">
            <button
              onClick={handleAnalyze}
              disabled={!canAnalyze}
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:bg-slate-300 disabled:shadow-none"
            >
              <Sparkles className="h-5 w-5" />
              Analyze with AI
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </section>
      )}

      {uiState === "loading" && (
        <section className="mt-24 flex flex-col items-center text-center fade-in">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
          <p className="mt-6 text-lg font-medium text-slate-700">
            AI is tailoring your resume…
          </p>
          <p className="mt-1 text-sm text-slate-500">
            This usually takes 20–35 seconds.
          </p>
        </section>
      )}

      {uiState === "error" && (
        <section className="mt-20 flex flex-col items-center fade-in">
          <div className="max-w-xl rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
            <p className="font-semibold">Something went wrong.</p>
            <p className="mt-2 whitespace-pre-wrap">{error}</p>
          </div>
          <button
            onClick={() => setUiState("input")}
            className="mt-6 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Try again
          </button>
        </section>
      )}

      {uiState === "results" && result && (
        <section className="mt-10 space-y-8 fade-in">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <div className="text-center">
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Original
                </p>
                <p className="text-4xl font-bold text-slate-700">
                  {result.score.original}
                  <span className="text-xl text-slate-400">/100</span>
                </p>
              </div>
              <ArrowRight className="h-8 w-8 text-indigo-500" />
              <div className="text-center">
                <p className="text-xs uppercase tracking-wider text-indigo-600">
                  Tailored
                </p>
                <p className="text-4xl font-bold text-indigo-600">
                  {result.score.tailored}
                  <span className="text-xl text-indigo-300">/100</span>
                </p>
              </div>
            </div>
            <p className="mx-auto mt-4 max-w-3xl text-center text-sm text-slate-600">
              {result.score.explanation}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              {result.jdSummary.jobTitle}
            </h2>
            {result.jdSummary.company && (
              <p className="text-sm text-slate-500">
                {result.jdSummary.company}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {result.jdSummary.requiredSkills.map((s) => (
                <span
                  key={`r-${s}`}
                  className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700"
                >
                  {s}
                </span>
              ))}
              {result.jdSummary.preferredSkills.map((s) => (
                <span
                  key={`p-${s}`}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-base font-semibold text-slate-900">
              Tailored Bullets
            </h3>
            <div className="grid gap-4 lg:grid-cols-2">
              {result.tailoredBullets.map((b, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Original
                  </p>
                  <p className="mt-1 text-sm text-slate-500 line-through">
                    {b.original}
                  </p>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-emerald-600">
                    Tailored
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {b.tailored}
                  </p>
                  <p className="mt-3 text-xs italic text-slate-500">
                    Why: {b.changeReason}
                  </p>
                  <div className="mt-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${confidenceColors[b.confidence]}`}
                    >
                      {b.confidence} confidence
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {result.gaps.length > 0 && (
            <div>
              <h3 className="mb-3 text-base font-semibold text-slate-900">
                Gaps to Address
              </h3>
              <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                {result.gaps.map((g, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 border-b border-slate-100 p-3 last:border-b-0"
                  >
                    <span
                      className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${importanceDot[g.importance]}`}
                    />
                    <div className="text-sm">
                      <span className="font-semibold text-slate-900">
                        {g.name}
                      </span>
                      <span className="text-slate-600">
                        {" "}
                        — {g.suggestedAction}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <KitSection
            kit={applicationKit}
            generating={kitGenerating}
            error={kitError}
            revealedCount={revealedCount}
            showCards={showCards}
            onGenerate={handleGenerateKit}
            onRegenerate={handleRegenerateKit}
          />

          <div className="flex justify-center pt-2">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:bg-slate-100"
            >
              {downloading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Download className="h-5 w-5" />
              )}
              Download Tailored Resume PDF
            </button>
          </div>

          {error && (
            <p className="text-center text-sm text-rose-600">{error}</p>
          )}
        </section>
      )}
    </main>
  );
}

function KitSection({
  kit,
  generating,
  error,
  revealedCount,
  showCards,
  onGenerate,
  onRegenerate,
}: {
  kit: ApplicationKit | null;
  generating: boolean;
  error: string | null;
  revealedCount: number;
  showCards: boolean;
  onGenerate: () => void;
  onRegenerate: () => void;
}) {
  if (!kit && !generating && !error) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-indigo-50 via-white to-emerald-50 p-8 shadow-sm">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-emerald-600 text-white">
            <Mail className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Generate Your Application Kit
            </h3>
            <p className="mt-1 max-w-xl text-sm text-slate-600">
              An AI agent drafts a personalized cover letter and recruiter cold
              email — then a second pass scans for AI-tells, length issues, and
              missing personalization, and rewrites if anything would make a
              recruiter skip your application.
            </p>
          </div>
          <button
            onClick={onGenerate}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-emerald-600 px-7 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-200 transition hover:from-indigo-700 hover:to-emerald-700"
          >
            <Sparkles className="h-5 w-5" />
            Generate Application Kit
          </button>
        </div>
      </div>
    );
  }

  if (generating) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-sm font-medium text-slate-700">
          The Recruiter Lens Agent is working…
        </p>
        <p className="text-xs text-slate-500">
          Drafting, checking, refining if needed. Usually 10–20 seconds.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6">
        <p className="text-sm font-semibold text-rose-800">
          Application kit generation failed
        </p>
        <p className="mt-1 whitespace-pre-wrap text-sm text-rose-700">
          {error}
        </p>
        <button
          onClick={onRegenerate}
          className="mt-3 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!kit) return null;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">
            Recruiter Lens Agent — Live Log
          </h3>
          <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            Quality {kit.qualityScore}/100
          </div>
        </div>
        <ul className="mt-4 space-y-2">
          {kit.agentLog.slice(0, revealedCount).map((entry, i) => (
            <LogRow key={i} entry={entry} />
          ))}
          {revealedCount < kit.agentLog.length && (
            <li className="flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              thinking…
            </li>
          )}
        </ul>
      </div>

      {showCards && (
        <div className="grid gap-5 fade-in lg:grid-cols-2">
          <ArtifactCard
            title="Cover Letter"
            subject={kit.coverLetter.subject}
            body={kit.coverLetter.body}
            icon={<Mail className="h-4 w-4" />}
            accentClass="from-indigo-500 to-blue-600"
          />
          <ArtifactCard
            title="Cold Email to Recruiter"
            subject={kit.coldEmail.subject}
            body={kit.coldEmail.body}
            icon={<Send className="h-4 w-4" />}
            accentClass="from-emerald-500 to-teal-600"
          />
        </div>
      )}

      {showCards && (
        <div className="flex justify-center">
          <button
            onClick={onRegenerate}
            className="text-xs font-medium text-slate-500 underline-offset-4 hover:text-indigo-600 hover:underline"
          >
            ↻ Regenerate application kit
          </button>
        </div>
      )}
    </div>
  );
}

function LogRow({ entry }: { entry: AgentLogEntry }) {
  const color =
    entry.kind === "warning"
      ? "text-amber-700"
      : entry.kind === "success"
        ? "text-emerald-700"
        : "text-slate-700";
  const Icon =
    entry.kind === "warning"
      ? AlertTriangle
      : entry.kind === "success"
        ? ShieldCheck
        : Eye;
  return (
    <li className={`fade-in flex items-start gap-2 text-sm ${color}`}>
      {entry.icon ? (
        <span className="text-base leading-tight">{entry.icon}</span>
      ) : (
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <span className="leading-relaxed">{entry.message}</span>
    </li>
  );
}

function ArtifactCard({
  title,
  subject,
  body,
  icon,
  accentClass,
}: {
  title: string;
  subject: string;
  body: string;
  icon: React.ReactNode;
  accentClass: string;
}) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    const text = `Subject: ${subject}\n\n${body}`;
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div
        className={`flex items-center gap-2 bg-gradient-to-r ${accentClass} px-5 py-3 text-white`}
      >
        {icon}
        <h4 className="text-sm font-semibold">{title}</h4>
      </div>
      <div className="space-y-3 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Subject
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900">{subject}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Body
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {body}
          </p>
        </div>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-emerald-600" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy to clipboard
            </>
          )}
        </button>
      </div>
    </div>
  );
}
```

---

## VERIFICATION CHECKLIST — FOR THE USER ONLY (DO NOT EXECUTE THIS AS THE AGENT)

The user will run these steps themselves after the agent finishes. The agent must NOT perform any of them. No browser opening, no HTTP requests, no dev-server starting by the agent.

1. The user restarts the dev server (`Ctrl+C`, then `npm run dev`) — required because the schema changed.
2. The user opens `http://localhost:3000`. If they previously generated a result with the OLD schema, they click "Start Over" to clear stale localStorage.
3. Paste a real resume + JD, click "Analyze with AI", wait for results.
4. Scroll to the new "Generate Your Application Kit" section. Click the gradient button.
5. The "Recruiter Lens Agent" status appears with a spinner ("drafting, checking, refining if needed"). Wait 10–25 seconds.
6. The agent log appears and animates line-by-line:
   - "✨ Drafting your cover letter and cold email…"
   - "👀 Putting on the recruiter lens…"
   - **If issues found:** "⚠ Cover letter — Generic opener…", "⚠ Cold email — AI-tell phrase…" etc.
   - "🔧 Refining the drafts…" (if needed)
   - "✅ Pass: sounds human, right length, personalized" OR "📨 Application kit ready"
7. After the log finishes animating, two cards reveal side-by-side: **Cover Letter** and **Cold Email to Recruiter**, each with a subject + body + Copy button.
8. Click "Copy to clipboard" on either card → paste into Notepad to verify the full subject + body copied.
9. Reload the browser tab. The cards are still there. The agent log shows instantly (no animation). `/api/generate-kit` is NOT called again.
10. Click "↻ Regenerate application kit". A new kit replaces the old one, animation plays again.
11. Click "Start Over". Returns to empty input state and clears the kit.
12. Try the recruiter-lens demo: pick a job description that's clearly different from your resume's domain. Watch the agent log — you should see at least 2-3 warning items (AI-tells caught, length issues, or missing company name), then a "Refining" step, then a pass.

If all 12 checks pass, Prompt 2 is complete. Prompt 3 (Mock Interview using Gemini) is next.

---

## 🛑 FINAL STOP INSTRUCTION FOR THE AGENT

After you create the 3 NEW files and REPLACE the 3 MODIFIED files in this prompt, your work is done. There are NO new packages to install in this prompt.

You must NOT:
- Open a browser, navigate to any URL, or use Playwright / Puppeteer / Chrome MCP.
- Run `npm run dev`, `npm run build`, `npm run start`, `npx next`, `npx tsc`, `npm run lint`, or any verification command.
- Make HTTP/fetch/curl requests to `localhost`, `127.0.0.1`, or anywhere else.
- Take screenshots. Spawn background processes. Monitor logs. Watch terminals.
- Loop to "fix" or "verify" anything. The verification checklist above is for the USER to run manually — not you.
- Read, list, or grep any directory outside the current one.
- Touch `.env.local`. The user already has their key in there from Prompt 1.

Output one short final message such as `"Done. All Prompt 2 files written. The user can restart npm run dev to see the new Application Kit section."` Then end your turn. That is all.
