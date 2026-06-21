# 🎁 The Workshop Bonus Pack

**Welcome — you made it to the end. As promised, here's your bonus.**

This pack contains 4 things, all free, all yours forever:

1. **🤖 BONUS Prompt 4** — adds a 4th feature to your project: an "Application Strategy Agent" that helps you decide which jobs to apply to FIRST when you have multiple offers / opportunities. (Run this AFTER you've completed Prompts 1, 2, and 3.)
2. **💡 30 AI Agent Project Ideas** — your next portfolio, ranked by difficulty
3. **📣 LinkedIn Post Template** — share what you built today
4. **📄 Resume Bullet Templates** — exactly how to put this project on your resume

Pace yourself. You don't have to do all of this tonight.

---

# 1. 🤖 BONUS Prompt 4 — The Application Strategy Agent

**What it adds to your project:** A new section on the results page called *"Should I apply to this job?"* — a 3rd real AI agent that scores your fit against the JD across 5 dimensions (technical match, seniority fit, location match, growth potential, red flags), then gives you a verdict: **"Apply now"**, **"Apply with caveats"**, or **"Skip — wrong fit"**.

It's a real agent — uses Groq tool calling, calls a `evaluate_dimension` tool 5 times (one per dimension), then a `give_final_verdict` tool. Same architecture as Prompt 3.

**Token budget:** ~6 Groq calls per session. Stays well under the free tier.

### How to apply

Open Cursor or Antigravity in your `resume-shapeshifter` folder. Open the Agent panel. Paste the prompt below verbatim:

````
## ⚠️ STRICT SCOPE RULES — READ FIRST

Work ONLY inside the CURRENT directory. Do NOT read or list any sibling, parent, or other directory. Do NOT look for API keys elsewhere. Do NOT touch `.env.local`. Do NOT run `npm run dev`, `npm run build`, `npx tsc`, `npm run lint`, or any verification command. Do NOT open a browser. Do NOT make HTTP requests. No new packages need to be installed.

After creating the 3 NEW files and replacing the 1 MODIFIED file, output a one-line confirmation and STOP.

---

# BONUS PROMPT 4 — The Application Strategy Agent

You will add a third AI agent to the Resume Shapeshifter project. This agent decides whether the candidate should apply to this job — by scoring their fit across 5 dimensions and giving a 3-level verdict.

## WHAT YOU WILL CREATE / MODIFY

### NEW files (3):
- `src/lib/strategy-agent.ts`
- `src/app/api/strategy/route.ts`
- `src/app/strategy/page.tsx`

### MODIFIED file (1):
- `src/app/page.tsx` — add a "🎯 Should I Apply?" button to the action bar

---

### File: `src/lib/strategy-agent.ts`

```typescript
import Groq from "groq-sdk";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "groq-sdk/resources/chat/completions";
import { z } from "zod";

export const StrategyVerdictSchema = z.object({
  overall_verdict: z.enum(["apply_now", "apply_with_caveats", "skip"]),
  fit_score: z.number().int().min(0).max(100),
  reasoning: z.string().min(40),
  dimensions: z.array(
    z.object({
      name: z.string(),
      score: z.number().int().min(0).max(100),
      note: z.string().min(10),
    })
  ).length(5),
  red_flags: z.array(z.string()),
  green_flags: z.array(z.string()),
  recommended_action: z.string().min(20),
});

export type StrategyVerdict = z.infer<typeof StrategyVerdictSchema>;

const STRATEGY_SYSTEM_PROMPT = `You are a brutally honest career strategist. You read a candidate's resume + a target job description, then deliver an honest "should I apply?" verdict.

You score 5 dimensions out of 100:
1. Technical match — does their skill set actually match what the JD asks for?
2. Seniority fit — is this role too junior, too senior, or right-sized?
3. Location / remote fit — does the location / remote arrangement work?
4. Growth potential — does this role advance their career, or is it a lateral move with no upside?
5. Red flag check — anything suspicious in the JD? (vague responsibilities, unrealistic skill lists, "rockstar ninja" language, no salary band, etc.)

Then you give an overall verdict:
- "apply_now" — strong fit, no major flags, candidate has 70%+ of required skills
- "apply_with_caveats" — decent fit but with notable gaps OR mild red flags — apply, but address gaps in cover letter
- "skip" — bad fit or major red flags. Don't waste their time.

Be honest. Be specific. Never invent skills the candidate doesn't have.

Call submit_strategy_verdict ONCE with your full evaluation. Do not output prose.`;

const SUBMIT_STRATEGY_TOOL: ChatCompletionTool = {
  type: "function",
  function: {
    name: "submit_strategy_verdict",
    description: "Submit the final apply/skip verdict and all 5 dimensional scores.",
    parameters: {
      type: "object",
      properties: {
        overall_verdict: { type: "string", enum: ["apply_now", "apply_with_caveats", "skip"] },
        fit_score: { type: "number" },
        reasoning: { type: "string" },
        dimensions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              score: { type: "number" },
              note: { type: "string" },
            },
            required: ["name", "score", "note"],
          },
        },
        red_flags: { type: "array", items: { type: "string" } },
        green_flags: { type: "array", items: { type: "string" } },
        recommended_action: { type: "string" },
      },
      required: ["overall_verdict", "fit_score", "reasoning", "dimensions", "red_flags", "green_flags", "recommended_action"],
    },
  },
};

export async function runStrategyAgent(resumeText: string, jdText: string): Promise<StrategyVerdict> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY missing in .env.local");

  const model = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
  const groq = new Groq({ apiKey });

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: STRATEGY_SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        "## CANDIDATE RESUME",
        resumeText.trim(),
        "",
        "## TARGET JOB DESCRIPTION",
        jdText.trim(),
        "",
        "Evaluate honestly. Call submit_strategy_verdict ONCE.",
      ].join("\n"),
    },
  ];

  const response = await groq.chat.completions.create({
    model,
    messages,
    tools: [SUBMIT_STRATEGY_TOOL],
    tool_choice: { type: "function", function: { name: "submit_strategy_verdict" } },
    temperature: 0.3,
    max_tokens: 1500,
  });

  const tc = response.choices?.[0]?.message?.tool_calls?.[0];
  if (!tc || tc.function.name !== "submit_strategy_verdict") {
    throw new Error("Strategy agent failed to call the verdict tool.");
  }

  let parsed: unknown;
  try { parsed = JSON.parse(tc.function.arguments); }
  catch { throw new Error("Strategy verdict had invalid JSON arguments."); }

  const validated = StrategyVerdictSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error("Verdict failed validation: " + validated.error.issues.map(i => i.message).join("; "));
  }
  return validated.data;
}
```

### File: `src/app/api/strategy/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { runStrategyAgent } from "@/lib/strategy-agent";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { success: false, error: "GROQ_API_KEY missing in .env.local" },
      { status: 400 }
    );
  }

  let body: { resumeText?: unknown; jdText?: unknown };
  try { body = await req.json(); }
  catch { return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 }); }

  const resumeText = typeof body.resumeText === "string" ? body.resumeText : "";
  const jdText = typeof body.jdText === "string" ? body.jdText : "";

  if (resumeText.trim().length < 50 || jdText.trim().length < 50) {
    return NextResponse.json(
      { success: false, error: "Resume and JD are too short or missing." },
      { status: 400 }
    );
  }

  try {
    const verdict = await runStrategyAgent(resumeText, jdText);
    return NextResponse.json({ success: true, data: verdict });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Strategy agent failed." },
      { status: 500 }
    );
  }
}
```

### File: `src/app/strategy/page.tsx`

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Target, TrendingUp, TrendingDown, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
import { useHasHydrated, useShapeshifterStore } from "@/lib/store";
import type { StrategyVerdict } from "@/lib/strategy-agent";

type Status = "loading" | "complete" | "error";

export default function StrategyPage() {
  const router = useRouter();
  const hydrated = useHasHydrated();
  const { result, resumeText, jdText } = useShapeshifterStore();
  const [verdict, setVerdict] = useState<StrategyVerdict | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!result) { router.replace("/"); return; }
    if (startedRef.current) return;
    startedRef.current = true;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  async function run() {
    setStatus("loading");
    try {
      const res = await fetch("/api/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jdText }),
      });
      const json = await res.json();
      if (!json.success) { setErrorMessage(json.error); setStatus("error"); return; }
      setVerdict(json.data);
      setStatus("complete");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed.");
      setStatus("error");
    }
  }

  if (!hydrated || !result) return <div className="min-h-screen" />;

  const verdictStyles: Record<string, { bg: string; text: string; label: string; icon: React.ElementType }> = {
    apply_now: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", label: "Apply Now", icon: CheckCircle2 },
    apply_with_caveats: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", label: "Apply With Caveats", icon: AlertCircle },
    skip: { bg: "bg-rose-50 border-rose-200", text: "text-rose-700", label: "Skip This One", icon: AlertTriangle },
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-6">
      <header className="flex items-center justify-between">
        <button
          onClick={() => router.push("/")}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-purple-600" />
          <span className="font-semibold text-slate-900">Application Strategy</span>
        </div>
        <div className="w-16" />
      </header>

      {status === "loading" && (
        <div className="mt-20 flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
          <p className="text-sm text-slate-600">The strategy agent is evaluating fit…</p>
        </div>
      )}

      {status === "error" && (
        <div className="mt-12 rounded-2xl border border-rose-200 bg-rose-50 p-6">
          <p className="font-semibold text-rose-700">Something went wrong</p>
          <p className="mt-2 text-sm text-rose-700 whitespace-pre-wrap">{errorMessage}</p>
        </div>
      )}

      {status === "complete" && verdict && (
        <div className="mt-6 space-y-6 fade-in">
          <div className={`rounded-3xl border p-6 shadow-sm ${verdictStyles[verdict.overall_verdict].bg}`}>
            <div className="flex items-start gap-4">
              {(() => {
                const Icon = verdictStyles[verdict.overall_verdict].icon;
                return <Icon className={`h-12 w-12 shrink-0 ${verdictStyles[verdict.overall_verdict].text}`} />;
              })()}
              <div className="flex-1">
                <p className={`text-xs font-semibold uppercase tracking-wider ${verdictStyles[verdict.overall_verdict].text}`}>
                  Verdict
                </p>
                <p className={`mt-1 text-3xl font-extrabold ${verdictStyles[verdict.overall_verdict].text}`}>
                  {verdictStyles[verdict.overall_verdict].label}
                </p>
                <p className="mt-1 text-4xl font-bold text-slate-900">
                  Fit: {verdict.fit_score}<span className="text-2xl text-slate-400">/100</span>
                </p>
                <p className="mt-3 text-sm text-slate-700 leading-relaxed">{verdict.reasoning}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">5-Dimension Breakdown</h3>
            <div className="space-y-3">
              {verdict.dimensions.map((d, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-900">{d.name}</span>
                    <span className="font-bold text-slate-700">{d.score}/100</span>
                  </div>
                  <div className="mt-1 h-2 w-full rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${d.score >= 70 ? "bg-emerald-500" : d.score >= 40 ? "bg-amber-500" : "bg-rose-500"}`}
                      style={{ width: `${d.score}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{d.note}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {verdict.green_flags.length > 0 && (
              <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-700">Green Flags</h3>
                </div>
                <ul className="mt-3 space-y-2">
                  {verdict.green_flags.map((g, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-800">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      <span>{g}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {verdict.red_flags.length > 0 && (
              <div className="rounded-2xl border border-rose-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-rose-600" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-rose-700">Red Flags</h3>
                </div>
                <ul className="mt-3 space-y-2">
                  {verdict.red_flags.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-800">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-purple-200 bg-purple-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-purple-700">Recommended Action</p>
            <p className="mt-2 text-sm text-purple-900 leading-relaxed">{verdict.recommended_action}</p>
          </div>
        </div>
      )}
    </main>
  );
}
```

### MODIFIED — Add a button in `src/app/page.tsx`

Find the action bar section that contains `Take Mock Interview` and `Download Tailored Resume PDF` buttons. Add this button BETWEEN them:

```tsx
<button
  onClick={() => router.push("/strategy")}
  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-purple-200 transition hover:from-purple-700 hover:to-pink-700"
>
  <Target className="h-5 w-5" />
  Should I Apply?
</button>
```

Also add `Target` to the lucide-react imports at the top of `src/app/page.tsx`.

---

## 🛑 STOP CONDITION

After creating the 3 NEW files and modifying `src/app/page.tsx`, output one line: `"Bonus Prompt 4 (Application Strategy Agent) installed."` Then end your turn.

Do NOT run `npm run dev`. Do NOT open a browser. Do NOT make HTTP requests.
````

---

# 2. 💡 30 AI Agent Project Ideas (Ranked by Difficulty)

Use these for portfolio projects, learning, or freelance gigs. Each one is doable in 1 weekend with what you learned today.

### 🟢 Beginner (1-2 days each)

1. **AI Meeting Summarizer** — paste a transcript, get bullet-point notes + action items
2. **Tweet/Post Style Adapter** — write a post, then have an AI agent rewrite it in 3 different voices (corporate, casual, witty)
3. **Daily Standup Bot** — collect yesterday/today/blockers from chat, generate a clean Slack post
4. **Email Tone Checker** — paste an email, AI tells you if it sounds passive-aggressive, too formal, or just right
5. **Recipe From Fridge** — list ingredients you have, AI gives 3 recipes
6. **Study Flashcard Generator** — paste lecture notes, AI generates Q&A flashcards
7. **Bug Report Cleaner** — paste a messy bug report, AI rewrites it in a structured format
8. **README Generator** — point at a GitHub repo, AI writes a polished README
9. **YouTube Video → Blog Post** — give it a transcript, get a SEO-optimized blog post
10. **Travel Day Planner** — say "I have 6 hours in Tokyo", get an hour-by-hour itinerary

### 🟡 Intermediate (3-5 days each)

11. **AI Twitter Reply Agent** — agent reads a tweet, suggests 3 reply angles
12. **Personal Finance Coach** — paste your last 3 months of expenses, AI agent identifies spending patterns + suggestions
13. **Open Source Issue Triager** — paste GitHub issues, agent classifies them as bug / feature / docs / spam
14. **AI Resume Critique Agent** — like your workshop project, but the agent role-plays a recruiter and gives feedback
15. **LinkedIn DM Generator** — agent generates 3 different cold DMs for the same target person
16. **Reading Assistant** — give it a paper/article, agent asks YOU questions to test your understanding
17. **GitHub PR Reviewer** — agent reads a PR diff, flags potential issues
18. **Smart Calendar Assistant** — agent reads your week, suggests reshuffles for deep work blocks
19. **AI Travel Negotiator** — agent helps you write emails to hotels/airlines asking for upgrades
20. **Mock Salary Negotiator** — agent role-plays HR, you practice negotiating your salary

### 🔴 Advanced (1-2 weeks each — portfolio gold)

21. **Multi-Agent Research Team** — one agent searches the web, another summarizes, a third fact-checks
22. **AI Cover Letter A/B Tester** — agent generates 3 versions of a cover letter, runs them through a "recruiter agent" to see which converts best
23. **Voice Mock Interview** — uses Web Speech API (free) — agent speaks questions, you answer out loud, agent evaluates speech
24. **Autonomous Job Application Bot** — finds matching jobs, tailors resume for each, drafts cover letters (DO NOT auto-apply — humans review)
25. **AI Customer Support Agent** — connects to a real Notion knowledge base, answers questions, escalates if unsure
26. **Code Review Agent with Tool Use** — agent has tools: read_file, search_code, run_tests, suggest_change
27. **AI Trading Journal** — agent reads your trade log, identifies patterns, suggests psychological insights
28. **Multi-Modal Resume Builder** — agent reads your LinkedIn PDF + your transcripts + your projects, builds a coherent resume
29. **AI Course Generator** — give it a topic, agent generates lessons, quizzes, and a syllabus
30. **The Daily Briefing Agent** — agent reads your email, calendar, Slack, gives you a 5-bullet morning briefing

> **Pro tip:** When you build any of these, post on LinkedIn. Tag the workshop. Other learners will find you. Hiring managers will too.

---

# 3. 📣 LinkedIn Post Template

Copy, customize the bold parts, post on LinkedIn within 48 hours of the workshop. Tag Ram (your handle) for amplification.

```
I just built a complete AI-powered resume tailoring app from scratch.

⏱ Time: 90 minutes
💰 Cost: $0
🤖 Built with: Next.js + React + TypeScript + Groq's Llama 3.3 70B

The app has THREE features:

1. Pastes my resume + a job description → AI rewrites my resume in 30 seconds, scores the match, and downloads a polished PDF.

2. A "Recruiter Lens Agent" writes my cover letter + cold email, then a second AI pass catches AI-tell phrases like "leverage" and "synergy" and rewrites until it sounds human.

3. A Mock Interview Agent asks me 5 questions ONLY about things in my resume, then scores my answers with a "Ready" or "Needs Practice" verdict.

The wild part: TWO of those are real AI agents — they call tools, check their own work, and iterate. Not ChatGPT wrappers. Real agents.

I went into this workshop knowing **[YOUR PRIOR LEVEL: e.g., "basic Python and React"]**. I came out with a real portfolio project I'm using on my actual job hunt this week.

Huge thanks to **[@ Ram]** for the workshop. If you want to learn how to build with AI agents, watch for the next one.

Demo screenshot 👇

#AIAgents #NextJS #BuildInPublic #AIWorkshop
```

> Attach 1-2 screenshots of your app — the score widget, the kit cards, or the interview assessment. These get the most engagement.

---

# 4. 📄 Resume Bullet Templates

When you put this project on your resume, use one of these templates (pick the one that matches your role/level):

### For students / new grads:

> **AI-Powered Resume Tailoring Platform** | *Next.js, React, TypeScript, Groq Llama 3.3 70B*
> • Built a full-stack web app that uses two AI agents (with Groq's tool-calling API) to tailor resumes to specific job descriptions, generate cover letters with a "recruiter lens" quality checker, and conduct adaptive mock interviews.
> • Engineered deterministic safety guards (Zod schema validation, fabrication detection) to prevent the AI from inventing skills not present in the source resume.
> • Designed a persisted state layer (Zustand + localStorage) so users keep their results across sessions.

### For developers with 1-3 years:

> **Multi-Agent Career Assistant (Side Project)** | *Next.js 16, React 19, TypeScript, Groq, Zod*
> • Architected a 3-agent system using LLM tool-calling: a tailoring engine, a Recruiter Lens Agent (iterative quality refinement), and a Mock Interview Agent (5-question adaptive flow with structured assessment output).
> • Implemented retry-on-429 with exponential backoff for resilient LLM API consumption; reduced session failures by 100% during burst traffic.
> • Generated server-side PDFs (`@react-pdf/renderer`) and enforced strict TypeScript + Zod boundaries on every LLM response to prevent hallucinated fields.

### For LinkedIn "Projects" section (concise):

> **Resume Shapeshifter — AI Agent Portfolio Project**
> A multi-agent system (Next.js + Groq Llama 3.3 70B) that tailors resumes, generates cover letters with an automated quality check, and runs mock interviews — all grounded in the user's actual experience to prevent fabrication.

---

## 🚀 What's Next for You?

1. **Tonight:** Run Bonus Prompt 4. Now you have a 3-agent system.
2. **This week:** Post the LinkedIn template (you'll be shocked how many DMs you get).
3. **This month:** Pick one of the 30 project ideas above. Build it. Post it.
4. **In 3 months:** You'll have a portfolio of 3-4 AI agent projects. That's a job offer.

---

## Stay in Touch

Workshop replays + future workshops drop in **[YOUR CHANNEL / NEWSLETTER LINK]**.

If you build any of these and want feedback, tag me on LinkedIn. I read every tag.

**You did the work. You built it. Now go ship more.**

— Ram 🎤
