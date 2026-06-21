# PROMPT 3 — The Mock Interview Agent (Powered by Groq)

## ⚠️ CRITICAL — READ THIS FIRST (DO NOT SKIP)

**This prompt is fully self-contained. Everything you need is in this prompt. Do not look anywhere else.**

**Strict scope rules — you MUST follow all of these:**

1. Work ONLY inside the CURRENT directory. The Resume Shapeshifter project from Prompts 1 and 2 is already here.
2. Do NOT read, list, glob, or inspect any SIBLING, PARENT, or OTHER directory on the user's machine — even if those directories have similar names like "resume_builder_4", "shapeshifter_old", "resume_builder_5", etc.
3. Do NOT look for API keys, `.env` files, or configuration in any other project. The user's `GROQ_API_KEY` is already in THIS project's `.env.local` from Prompt 1.
4. Within this directory, you MAY read existing files from Prompts 1 and 2 to understand the project state. But ONLY this directory.
5. Create the NEW files listed below and REPLACE the MODIFIED files exactly as specified — character-for-character.
6. Do NOT modify anything outside this directory.
7. Do NOT touch `.env.local`. The user already has their Groq key in there from Prompt 1.

**DO NOT run, test, or verify the project after building. Specifically:**

8. NO new packages are installed in this prompt. `groq-sdk` was installed in Prompt 1 and is already available.
9. Do NOT run `npm install`, `npm run dev`, `npm run build`, `npx tsc`, `npm run lint`, or any other command.
10. Do NOT open a browser. Do NOT make HTTP requests. Do NOT use `curl`, `fetch`, Playwright, Puppeteer, or any browser automation tool.
11. Do NOT take screenshots. Do NOT poll endpoints. Do NOT monitor logs. Do NOT test the interview endpoint.
12. Do NOT loop to "fix" any imagined error. After all 4 files are written, you are done.

After all files are written, output one short message: `"Prompt 3 files written. The user should restart npm run dev to test the Mock Interview."` Then end your turn.

If any step fails, STOP and report. Do NOT improvise by looking in other folders or running alternative commands.

---

Continue building the **Resume Shapeshifter** project. Prompts 1 and 2 are complete: the user can paste a resume + JD, get a tailored result, download a PDF, and generate a polished cover letter + cold email through the Recruiter Lens Agent.

In this prompt you will add the final feature: a **Mock Interview Agent**, a real Groq tool-calling agent that conducts a 5-question text-chat interview grounded ONLY in the candidate's resume, then evaluates their answers and delivers a final score with a "ready" or "not ready" verdict.

**This agent uses the SAME `GROQ_API_KEY` from Prompts 1 and 2** — no new key, no new account, no new SDK install. The full token budget per workshop session stays comfortably under Groq's free tier (14,400 requests/day, 30/minute per key).

Create every file EXACTLY as shown. Light theme. The IDE just copies files.

---

## WHAT YOU WILL CREATE / MODIFY

### NEW files (3):
- `src/lib/interview-agent.ts`
- `src/app/api/interview/route.ts`
- `src/app/interview/page.tsx`

### MODIFIED file (1):
- `src/app/page.tsx` (REPLACE entirely — adds the "🎤 Take Mock Interview" button next to the kit and PDF download buttons, and updates the footer to mention only Groq)

---

## NEW FILES

### File: `src/lib/interview-agent.ts`

```typescript
import Groq from "groq-sdk";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "groq-sdk/resources/chat/completions";
import { z } from "zod";

export const InterviewAssessmentSchema = z.object({
  overall_score: z.number().int().min(0).max(100),
  verdict: z.enum(["ready", "not_ready"]),
  summary: z.string().min(20),
  strengths: z.array(z.string().min(3)).min(2).max(4),
  areas_to_improve: z.array(z.string().min(3)).min(2).max(4),
});

export type InterviewAssessment = z.infer<typeof InterviewAssessmentSchema>;

export interface InterviewMessage {
  role: "agent" | "user";
  content: string;
}

export type InterviewTurnResult =
  | { type: "question"; message: string; questionNumber: number }
  | { type: "final"; message: string; assessment: InterviewAssessment };

const INTERVIEW_SYSTEM_PROMPT = `You are an experienced interview coach conducting a mock job interview. You are interviewing a candidate for a specific role.

ABSOLUTE RULES — NEVER VIOLATE:
1. You may ONLY ask questions about content present in the candidate's resume.
2. You may NEVER ask about technologies, projects, employers, certifications, or experience not mentioned in the resume.
3. You will ask EXACTLY 5 questions total. No more, no less.
4. After receiving the answer to question 5, you MUST call the submit_final_assessment function. Do NOT ask a 6th question.

QUESTION STRATEGY:
- Question 1: A warm-up question grounded in their strongest experience.
- Question 2: A technical deep-dive on a specific project or skill they list.
- Question 3: Adaptive — probe deeper into an interesting point from their previous answer.
- Question 4: A scenario question tied to the JD requirements they CAN address from their actual resume.
- Question 5: A motivation / fit question.

CONVERSATION STYLE:
- Friendly but professional.
- Number every question explicitly, e.g., "Question 2 of 5: ...".
- For your FIRST message: greet them warmly (use their name if visible in the resume), briefly explain the format (5 questions based on their resume + the JD), then ask Question 1.
- After answers 1, 2, 3, and 4: give a brief 1-2 sentence acknowledgment, then ask the next question.
- After answer 5: do NOT ask any more questions. Call submit_final_assessment immediately.

Be honest. Don't inflate scores. A candidate who gave vague, generic answers should not score above 60. A candidate who gave specific, structured, evidence-backed answers should score 80+.`;

const SUBMIT_ASSESSMENT_TOOL: ChatCompletionTool = {
  type: "function",
  function: {
    name: "submit_final_assessment",
    description:
      "Submit the final evaluation after the candidate has answered all 5 questions. Call this ONLY after question 5 has been answered.",
    parameters: {
      type: "object",
      properties: {
        overall_score: {
          type: "number",
          description: "Honest 0-100 overall interview score.",
        },
        verdict: {
          type: "string",
          enum: ["ready", "not_ready"],
          description: "'ready' if overall_score >= 75, otherwise 'not_ready'.",
        },
        summary: {
          type: "string",
          description: "3-4 sentence synthesis of the candidate's overall performance.",
        },
        strengths: {
          type: "array",
          items: { type: "string" },
          description: "2 to 3 specific things the candidate did well.",
        },
        areas_to_improve: {
          type: "array",
          items: { type: "string" },
          description: "2 to 3 specific things to work on before the real interview.",
        },
      },
      required: [
        "overall_score",
        "verdict",
        "summary",
        "strengths",
        "areas_to_improve",
      ],
    },
  },
};

function buildContextSummary(resumeText: string, jdText: string): string {
  return [
    "## TARGET ROLE (JOB DESCRIPTION)",
    jdText.trim(),
    "",
    "## CANDIDATE RESUME (source of truth — every question must be grounded in this)",
    resumeText.trim(),
    "",
    "Begin the mock interview now. Open with a warm greeting and Question 1 of 5.",
  ].join("\n");
}

function isRateLimit(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const msg = (err as { message?: string }).message ?? "";
  const status = (err as { status?: number }).status;
  if (status === 429) return true;
  return (
    msg.includes("429") ||
    msg.toLowerCase().includes("rate limit") ||
    msg.toLowerCase().includes("too many requests") ||
    msg.toLowerCase().includes("quota")
  );
}

function friendlyRateLimitMessage(originalErr: unknown): string {
  const msg = originalErr instanceof Error ? originalErr.message : "";
  let retryAfter = 30;
  const m = msg.match(/retry.*?(\d+)\s*s/i);
  if (m) retryAfter = parseInt(m[1], 10) || 30;
  return [
    "Groq is rate-limited right now (too many requests in a short burst).",
    "",
    `Two things to try:`,
    `1. Wait ~${retryAfter} seconds and click Restart on the interview page.`,
    `2. If this keeps happening, check your free quota at https://console.groq.com (free tier = 30 requests/minute, 14400/day per key).`,
  ].join("\n");
}

async function callWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRateLimit(err) || attempt === maxRetries) break;
      const backoffMs = 1500 * Math.pow(2, attempt) + Math.floor(Math.random() * 500);
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }
  if (isRateLimit(lastErr)) {
    throw new Error(friendlyRateLimitMessage(lastErr));
  }
  throw lastErr instanceof Error ? lastErr : new Error("Groq call failed.");
}

export async function runInterviewTurn(
  resumeText: string,
  jdText: string,
  conversation: InterviewMessage[]
): Promise<InterviewTurnResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY is missing in .env.local. Get a free key from https://console.groq.com/keys and restart the dev server."
    );
  }

  const model = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
  const groq = new Groq({ apiKey });

  const agentQuestionsAsked = conversation.filter(
    (m) => m.role === "agent"
  ).length;
  const userAnswersGiven = conversation.filter(
    (m) => m.role === "user"
  ).length;

  const shouldForceFinalize =
    agentQuestionsAsked >= 5 && userAnswersGiven >= 5;

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: INTERVIEW_SYSTEM_PROMPT },
    { role: "user", content: buildContextSummary(resumeText, jdText) },
    ...conversation.map<ChatCompletionMessageParam>((m) =>
      m.role === "agent"
        ? { role: "assistant", content: m.content }
        : { role: "user", content: m.content }
    ),
  ];

  const response = await callWithRetry(() =>
    groq.chat.completions.create({
      model,
      messages,
      tools: [SUBMIT_ASSESSMENT_TOOL],
      tool_choice: shouldForceFinalize
        ? {
            type: "function",
            function: { name: "submit_final_assessment" },
          }
        : "auto",
      temperature: 0.5,
      max_tokens: 1200,
    })
  );

  const msg = response.choices?.[0]?.message;
  if (!msg) {
    throw new Error("Empty response from Groq.");
  }

  const toolCall = msg.tool_calls?.[0];
  if (toolCall && toolCall.function.name === "submit_final_assessment") {
    let parsedArgs: unknown;
    try {
      parsedArgs = JSON.parse(toolCall.function.arguments);
    } catch {
      throw new Error("Final assessment had malformed JSON arguments.");
    }
    const validated = InterviewAssessmentSchema.safeParse(parsedArgs);
    if (!validated.success) {
      throw new Error(
        "Final assessment failed validation: " +
          validated.error.issues.map((i) => i.message).join("; ")
      );
    }
    return {
      type: "final",
      message:
        msg.content?.trim() ||
        "Thank you. Here is your final assessment based on all five answers.",
      assessment: validated.data,
    };
  }

  const content = (msg.content ?? "").trim();
  if (!content) {
    throw new Error("Agent returned an empty question.");
  }

  return {
    type: "question",
    message: content,
    questionNumber: agentQuestionsAsked + 1,
  };
}
```

### File: `src/app/api/interview/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import {
  runInterviewTurn,
  type InterviewMessage,
} from "@/lib/interview-agent";

export const runtime = "nodejs";
export const maxDuration = 60;

interface InterviewBody {
  resumeText?: unknown;
  jdText?: unknown;
  conversation?: unknown;
}

function isInterviewMessage(value: unknown): value is InterviewMessage {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    (v.role === "agent" || v.role === "user") &&
    typeof v.content === "string" &&
    v.content.length > 0
  );
}

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      {
        success: false,
        error:
          "GROQ_API_KEY is missing in .env.local. Get a free key from https://console.groq.com/keys and restart the dev server.",
      },
      { status: 400 }
    );
  }

  let body: InterviewBody;
  try {
    body = (await req.json()) as InterviewBody;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const resumeText =
    typeof body.resumeText === "string" ? body.resumeText : "";
  const jdText = typeof body.jdText === "string" ? body.jdText : "";
  const conversation = Array.isArray(body.conversation)
    ? body.conversation.filter(isInterviewMessage)
    : [];

  if (resumeText.trim().length < 50 || jdText.trim().length < 50) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Resume and job description are missing or too short. Return to the results page and re-run analysis.",
      },
      { status: 400 }
    );
  }

  try {
    const turn = await runInterviewTurn(resumeText, jdText, conversation);
    return NextResponse.json({ success: true, data: turn });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Interview agent failed.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
```

### File: `src/app/interview/page.tsx`

```tsx
"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  Send,
  Loader2,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Target,
} from "lucide-react";
import { useHasHydrated, useShapeshifterStore } from "@/lib/store";
import type {
  InterviewAssessment,
  InterviewMessage,
  InterviewTurnResult,
} from "@/lib/interview-agent";

type Status =
  | "loading_first"
  | "user_turn"
  | "agent_thinking"
  | "complete"
  | "error";

const TOTAL_QUESTIONS = 5;

export default function InterviewPage() {
  const router = useRouter();
  const hydrated = useHasHydrated();
  const { result, resumeText, jdText } = useShapeshifterStore();

  const [conversation, setConversation] = useState<InterviewMessage[]>([]);
  const [questionsAsked, setQuestionsAsked] = useState<number>(0);
  const [userInput, setUserInput] = useState("");
  const [status, setStatus] = useState<Status>("loading_first");
  const [assessment, setAssessment] = useState<InterviewAssessment | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const startedRef = useRef(false);
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const fetchTurn = useCallback(
    async (history: InterviewMessage[]): Promise<InterviewTurnResult> => {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText,
          jdText,
          conversation: history,
        }),
      });
      const json = (await res.json()) as
        | { success: true; data: InterviewTurnResult }
        | { success: false; error: string };
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    [resumeText, jdText]
  );

  const startInterview = useCallback(async () => {
    setStatus("loading_first");
    setErrorMessage(null);
    setConversation([]);
    setQuestionsAsked(0);
    setAssessment(null);
    try {
      const turn = await fetchTurn([]);
      if (turn.type === "question") {
        setConversation([{ role: "agent", content: turn.message }]);
        setQuestionsAsked(turn.questionNumber);
        setStatus("user_turn");
      } else {
        setAssessment(turn.assessment);
        setStatus("complete");
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to start interview."
      );
      setStatus("error");
    }
  }, [fetchTurn]);

  useEffect(() => {
    if (!hydrated) return;
    if (!result) {
      router.replace("/");
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;
    void startInterview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  useLayoutEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation, status, assessment]);

  useEffect(() => {
    if (status === "user_turn") {
      textareaRef.current?.focus();
    }
  }, [status]);

  async function handleSend() {
    const trimmed = userInput.trim();
    if (!trimmed || status !== "user_turn") return;

    const newUserMsg: InterviewMessage = { role: "user", content: trimmed };
    const newConv = [...conversation, newUserMsg];
    setConversation(newConv);
    setUserInput("");
    setStatus("agent_thinking");

    try {
      const turn = await fetchTurn(newConv);
      if (turn.type === "question") {
        setConversation((prev) => [
          ...prev,
          { role: "agent", content: turn.message },
        ]);
        setQuestionsAsked(turn.questionNumber);
        setStatus("user_turn");
      } else {
        if (turn.message) {
          setConversation((prev) => [
            ...prev,
            { role: "agent", content: turn.message },
          ]);
        }
        setAssessment(turn.assessment);
        setStatus("complete");
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Agent failed.");
      setStatus("error");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void handleSend();
    }
  }

  if (!hydrated || !result) {
    return <div className="min-h-screen" />;
  }

  const filledDots = Math.min(
    TOTAL_QUESTIONS,
    Math.max(0, questionsAsked - (status === "user_turn" ? 1 : 0))
  );
  const visualProgress =
    status === "complete"
      ? TOTAL_QUESTIONS
      : Math.min(TOTAL_QUESTIONS, questionsAsked);

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
          <Bot className="h-5 w-5 text-emerald-600" />
          <span className="font-semibold text-slate-900">Mock Interview</span>
        </div>
        <button
          onClick={() => void startInterview()}
          disabled={status === "loading_first" || status === "agent_thinking"}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Restart
        </button>
      </header>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {result.jdSummary.jobTitle}
            {result.jdSummary.company
              ? ` · ${result.jdSummary.company}`
              : ""}
          </p>
          <p className="text-xs font-medium text-slate-500">
            Question {Math.min(visualProgress, TOTAL_QUESTIONS)} of{" "}
            {TOTAL_QUESTIONS}
          </p>
        </div>
        <div className="mt-2 flex gap-1.5">
          {Array.from({ length: TOTAL_QUESTIONS }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i < filledDots
                  ? "bg-emerald-600"
                  : i === filledDots && status !== "complete"
                    ? "bg-emerald-300"
                    : "bg-slate-200"
              }`}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Powered by Groq + Llama 3.3 70B
        </p>
      </div>

      <section className="mt-6 flex-1 space-y-4">
        {status === "loading_first" && conversation.length === 0 && (
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-6">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
            <span className="text-sm text-slate-600">
              Preparing your interview…
            </span>
          </div>
        )}

        {conversation.map((m, i) => (
          <Bubble key={i} message={m} />
        ))}

        {status === "agent_thinking" && (
          <div className="fade-in flex max-w-[85%] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <span
                className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"
                style={{ animationDelay: "300ms" }}
              />
            </div>
            <span className="text-xs text-slate-500">
              {questionsAsked >= TOTAL_QUESTIONS
                ? "Evaluating your answers…"
                : "Thinking…"}
            </span>
          </div>
        )}

        {status === "complete" && assessment && (
          <AssessmentCard assessment={assessment} />
        )}

        {status === "error" && (
          <div className="fade-in flex flex-col items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5">
            <div className="flex items-center gap-2 text-rose-700">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-semibold">Something went wrong</span>
            </div>
            <p className="whitespace-pre-wrap text-sm text-rose-700">
              {errorMessage ?? "Unknown error."}
            </p>
            <button
              onClick={() => void startInterview()}
              className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
            >
              Try again
            </button>
          </div>
        )}

        <div ref={scrollAnchorRef} />
      </section>

      {status === "user_turn" && (
        <div className="sticky bottom-0 mt-6 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              placeholder="Type your answer… (Cmd/Ctrl + Enter to send)"
              className="flex-1 resize-none rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
            <button
              onClick={() => void handleSend()}
              disabled={!userInput.trim()}
              className="inline-flex h-12 items-center gap-2 rounded-2xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:bg-slate-300"
            >
              <Send className="h-4 w-4" />
              Send
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function Bubble({ message }: { message: InterviewMessage }) {
  if (message.role === "agent") {
    return (
      <div className="fade-in flex w-full justify-start">
        <div className="flex max-w-[85%] gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Bot className="h-4 w-4" />
          </div>
          <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm">
            <p className="whitespace-pre-wrap leading-relaxed">
              {message.content}
            </p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="fade-in flex w-full justify-end">
      <div className="max-w-[85%]">
        <div className="rounded-2xl rounded-tr-sm bg-emerald-600 px-4 py-3 text-sm text-white shadow-sm">
          <p className="whitespace-pre-wrap leading-relaxed">
            {message.content}
          </p>
        </div>
      </div>
    </div>
  );
}

function AssessmentCard({
  assessment,
}: {
  assessment: InterviewAssessment;
}) {
  const isReady = assessment.verdict === "ready";
  return (
    <div className="fade-in space-y-4">
      <div
        className={`rounded-3xl border p-6 shadow-sm ${
          isReady
            ? "border-emerald-200 bg-emerald-50"
            : "border-amber-200 bg-amber-50"
        }`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
              isReady
                ? "bg-emerald-600 text-white"
                : "bg-amber-500 text-white"
            }`}
          >
            {isReady ? (
              <CheckCircle2 className="h-7 w-7" />
            ) : (
              <Target className="h-7 w-7" />
            )}
          </div>
          <div className="flex-1">
            <p
              className={`text-xs font-semibold uppercase tracking-wider ${
                isReady ? "text-emerald-700" : "text-amber-700"
              }`}
            >
              {isReady ? "Verdict: Ready" : "Verdict: Needs Practice"}
            </p>
            <p
              className={`mt-1 text-5xl font-extrabold ${
                isReady ? "text-emerald-700" : "text-amber-700"
              }`}
            >
              {assessment.overall_score}
              <span
                className={`text-2xl ${
                  isReady ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                /100
              </span>
            </p>
            <p
              className={`mt-3 text-sm leading-relaxed ${
                isReady ? "text-emerald-900" : "text-amber-900"
              }`}
            >
              {assessment.summary}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-700">
              Strengths
            </h3>
          </div>
          <ul className="mt-3 space-y-2">
            {assessment.strengths.map((s, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-slate-800"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-amber-700">
              Areas to Improve
            </h3>
          </div>
          <ul className="mt-3 space-y-2">
            {assessment.areas_to_improve.map((a, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-slate-800"
              >
                <Target className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
```

---

## MODIFIED FILE — REPLACE `src/app/page.tsx` ENTIRELY

This is the same as the version from Prompt 2, with two small changes:
- Adds a "🎤 Take Mock Interview" button to the action bar
- Updates the footer to mention only Groq (no Gemini reference)

### File: `src/app/page.tsx`

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  MessageSquare,
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
  const router = useRouter();
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

          <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:flex-wrap sm:justify-center">
            <button
              onClick={() => router.push("/interview")}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-200 transition hover:from-emerald-700 hover:to-teal-700"
            >
              <MessageSquare className="h-5 w-5" />
              Take Mock Interview
            </button>
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

The user will run these steps themselves after the agent finishes. The agent must NOT perform any of them.

1. The user restarts the dev server (`Ctrl+C`, then `npm run dev`).
2. The user opens `http://localhost:3000` and sees THREE action buttons at the bottom of the results page:
   - "Generate Application Kit" / kit display (from Prompt 2)
   - "🎤 Take Mock Interview" (NEW emerald→teal gradient)
   - "Download Tailored Resume PDF"
3. The user clicks "Take Mock Interview". Browser navigates to `/interview`.
4. Within 4–8 seconds, the first agent message appears as a chat bubble — warm greeting + Question 1 of 5, grounded in something specific from their resume.
5. The user types a real answer and clicks "Send" (or Cmd/Ctrl+Enter).
6. The agent shows a 3-dot typing indicator (~3–6 seconds), then asks Question 2. Progress bar advances.
7. The user continues through Q3, Q4, and Q5.
8. After Q5: agent shows "Evaluating your answers…" then displays the final assessment card with verdict badge ("Ready" green OR "Needs Practice" amber), 0-100 score, summary, Strengths, and Areas to Improve.
9. The user clicks "Restart" → conversation clears, fresh Q1 appears.
10. The user clicks "Back" → returns to home page. All Prompt 1 + 2 data is intact.
11. **Boundary check:** the agent never asked about a technology or experience NOT in the resume.
12. **Rate-limit safety:** if the user spams Restart 5+ times in a row, the retry-on-429 logic kicks in automatically — no ugly errors.

If all 12 checks pass, the project is complete. The user now has:

- **Resume tailoring** powered by Groq (Prompt 1)
- **Recruiter Lens Agent** for cover letter + cold email, also powered by Groq (Prompt 2)
- **Mock Interview Agent** for adaptive 5-question interview with assessment, also powered by Groq (Prompt 3)

All running on ONE Groq API key. ONE account. ONE provider. No external dependencies. ~10 LLM calls per full session — well under Groq's free-tier 14,400/day limit.

Congratulations — you built it. 🎤

---

## 🛑 FINAL STOP INSTRUCTION FOR THE AGENT

After you create the 3 NEW files and REPLACE `src/app/page.tsx`, your work is done. No new packages need to be installed.

You must NOT:
- Open a browser, navigate to any URL, or use Playwright / Puppeteer / Chrome MCP.
- Run `npm install`, `npm run dev`, `npm run build`, `npm run start`, `npx next`, `npx tsc`, `npm run lint`, or any verification command.
- Restart any dev server. Do NOT issue `Ctrl+C` to a dev server. The user handles all server lifecycle.
- Make HTTP/fetch/curl requests to `localhost`, `127.0.0.1`, or anywhere else.
- Take screenshots. Spawn background processes. Monitor logs. Watch terminals.
- Loop to "fix" or "verify" anything. The verification checklist above is for the USER to run manually — not you.
- Read, list, or grep any directory outside the current one.
- Touch `.env.local`. The user already has their `GROQ_API_KEY` in there from Prompt 1.

Output one short final message such as `"Done. All Prompt 3 files written. The user should restart npm run dev to try the Mock Interview agent."` Then end your turn. That is all.
