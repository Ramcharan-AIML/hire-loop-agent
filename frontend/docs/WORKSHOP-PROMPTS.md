# Resume Shapeshifter — Single-Prompt Workshop Kit

> **For:** Cursor or Google Antigravity, free tier.
> **LLM:** Groq (free, Llama 3.3 70B).
> **Cost to participants:** $0.
> **Workshop duration:** 90 minutes.
> **Design goal:** Maximum free-tier safety. ONE prompt. ~10 files generated. ONE LLM call per user session. No inter-prompt re-read phase.

This is the leanest possible build that still delivers a real workshop wow. Participants paste a resume + JD, click Analyze, and a single LLM call returns the tailored bullets, scoring, gap analysis, **and** a personalized cover letter — all at once. Two downloadable PDFs. Persisted to localStorage so closing the tab doesn't lose anything.

---

## Participant Setup (10 min at the start)

Send this 48 hours before the workshop.

| Tool | Where | Verify |
|---|---|---|
| Node.js ≥ 20 LTS | https://nodejs.org | `node -v` shows v20+ |
| Cursor **or** Google Antigravity | Their websites | App opens |
| Free Groq API key | https://console.groq.com/keys | Key copied somewhere safe |

**On workshop day:**
1. Create an empty folder (e.g. `resume-shapeshifter`).
2. Open it in Cursor or Antigravity.
3. Open the Agent panel. Enable auto-accept edits.
4. Confirm the agent can create files, edit files, and run terminal commands.
5. Paste **The Prompt** below.

Folder must be **completely empty** at start.

---

# 🟪 THE PROMPT — Build Resume Shapeshifter

> **What it does:** Scaffolds Next.js, sets up Groq, and builds a complete single-page AI app where the user pastes a resume + JD, clicks Analyze, and ONE LLM call returns tailored bullets + scoring + gaps + a personalized cover letter. Downloads the tailored resume PDF and the cover letter PDF. Persists to localStorage.
>
> **Files generated:** ~10 (plus what `create-next-app` produces).
> **Run time:** 8-12 minutes.
> **LLM API calls per user session:** 1.

Paste this verbatim into the Agent panel:

```
You are building "Resume Shapeshifter" — a focused single-page web app. The user pastes their resume and a job description, clicks Analyze, and a single Groq LLM call returns tailored resume bullets, a before/after match score, a gap analysis, and a personalized cover letter — all in one JSON response. Two PDF downloads are produced from that response.

THIS IS A LITE BUILD. Strict rules:
- Minimal files (~10 total).
- EXACTLY ONE LLM call per user submission. No chained calls. No agent loops. No SSE streaming.
- Paste-only inputs. NO file uploads. NO pdf-parse. NO mammoth.
- Single-page UI with three states (input → loading → results) managed by React useState.
- No design-system folder. No in-house UI primitives. Plain Tailwind utility classes inline.
- No framer-motion.

TECH STACK (use these exact versions):
- Next.js 16 (App Router) + TypeScript strict mode
- React 19
- Tailwind CSS v4
- Zod 4
- groq-sdk (latest)
- @react-pdf/renderer
- zustand ^5 (with persist middleware for localStorage)
- lucide-react (for icons)

============================================================
STEP 1 — SCAFFOLD IN THE CURRENT DIRECTORY
============================================================
Run in the terminal (in the CURRENT folder, NOT a subfolder):

    npx -y create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes

Then install runtime dependencies in ONE command:

    npm install zod@^4 zustand@^5 groq-sdk @react-pdf/renderer lucide-react

============================================================
STEP 2 — ENV FILES
============================================================
Create .env.example:

    # Get your free Groq API key from: https://console.groq.com/keys
    GROQ_API_KEY=
    GROQ_MODEL=llama-3.3-70b-versatile

Create .env.local with the same two keys but empty GROQ_API_KEY=. Confirm .env.local is in .gitignore.

============================================================
STEP 3 — CREATE EXACTLY THESE FILES (NOTHING MORE)
============================================================

FILE — src/lib/schema.ts
Define ONE composite Zod schema TailoringResultSchema with these fields:

    score: {
      original: number int 0-100,
      tailored: number int 0-100,
      explanation: string
    }
    jdSummary: {
      jobTitle: string,
      company: string optional,
      requiredSkills: string[],
      preferredSkills: string[]
    }
    tailoredBullets: Array of {
      original: string,
      tailored: string,
      changeReason: string,
      confidence: "high" | "medium" | "low"
    }  with min(1) and max(6)
    gaps: Array of {
      name: string,
      importance: "high" | "medium" | "low",
      suggestedAction: string
    }  with max(4)
    coverLetter: {
      subject: string,
      body: string                     // 250-350 words, paragraphs separated by \n\n
    }

Export the schema AND `export type TailoringResult = z.infer<typeof TailoringResultSchema>`. This is the ONLY schema file in the project.

FILE — src/lib/groq.ts
Export ONE async function `tailorResume(resumeText: string, jdText: string): Promise<TailoringResult>`:

- Instantiate Groq client with apiKey from process.env.GROQ_API_KEY.
- Use model = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile".
- Call groq.chat.completions.create with temperature 0.3, response_format { type: "json_object" }, max_tokens 2500.

System prompt (use this exact text):
    "You are an expert resume coach and career application strategist. Given a candidate's resume and a target job description, output a STRICT JSON object matching the schema described in the user message.

    ABSOLUTE RULES:
    1. NEVER invent skills, employers, technologies, certifications, metrics, or experience not present in the resume.
    2. Limit output to the 6 most impactful bullet rewrites and the 4 most important gaps.
    3. Score both original and tailored versions honestly out of 100, with a 2-3 sentence explanation.
    4. Use the JD's preferred terminology only where the candidate's original content supports it.
    5. Keep all numerical values from the original bullets exactly as-is — never introduce new numbers.
    6. The cover letter must be 250-350 words, professional tone, addressed to the hiring team. It references actual experience from the resume and connects it to the JD requirements. Paragraphs separated by \n\n. No fabrication.

    Output ONLY a JSON object. No markdown fences. No prose before or after."

User message: build a string that contains (a) a description of the schema shape in plain English, (b) the heading "## CANDIDATE RESUME" followed by the resume text, (c) the heading "## TARGET JOB DESCRIPTION" followed by the JD text.

Parse response.choices[0].message.content as JSON. Validate with TailoringResultSchema.safeParse. On validation failure, retry ONCE with an added system instruction appended: "Your previous response failed schema validation. Return STRICT JSON only this time, matching the schema exactly." On second failure, throw new Error with a clear message.

FILE — src/lib/store.ts
"use client" at the top. Zustand store with persist middleware:

    interface Store {
      result: TailoringResult | null;
      resumeText: string;
      jdText: string;
      setResult: (r: TailoringResult, resumeText: string, jdText: string) => void;
      clear: () => void;
    }

Use `persist((set) => ({ ... }), { name: "resume-shapeshifter", storage: createJSONStorage(() => localStorage), partialize: (s) => ({ result: s.result, resumeText: s.resumeText, jdText: s.jdText }) })`.

Also export a `useHasHydrated()` hook (useEffect + useState pattern using useTailoringStore.persist.onFinishHydration) so the page can guard against SSR/CSR mismatches.

FILE — src/app/api/tailor/route.ts
- `export const runtime = "nodejs"`
- `export const maxDuration = 60`
- POST handler. Body: { resumeText: string, jdText: string }.
- If !process.env.GROQ_API_KEY, return Response.json({ success: false, error: "Add your Groq API key to .env.local. Get a free key at https://console.groq.com/keys, then restart the dev server." }, { status: 400 }).
- If resumeText.trim().length < 50 OR jdText.trim().length < 50, return Response.json({ success: false, error: "Please paste a real resume and a real job description (at least 50 characters each)." }, { status: 400 }).
- Call tailorResume in try/catch. On success: Response.json({ success: true, data: result }). On failure: Response.json({ success: false, error: errorMessage }, { status: 500 }).

FILE — src/lib/pdf-templates.tsx
Use @react-pdf/renderer. Export TWO React components and TWO buffer-rendering functions:

(1) TailoredResumePdf — props { result: TailoringResult, resumeText: string }. Single Letter portrait page, 11pt body, simple StyleSheet. Layout:
- Header: candidate name extracted from the first non-empty line of resumeText (best effort), 18pt bold.
- Subheading: "Tailored for: {result.jdSummary.jobTitle}" + " at " + company if present, 12pt grey.
- Score line: "Match Score: {result.score.tailored} / 100 (up from {result.score.original})", 11pt.
- Section "Targeted Skills" — comma-separated list of result.jdSummary.requiredSkills.
- Section "Tailored Experience Bullets" — for each item in result.tailoredBullets, render "• " + bullet.tailored.
- Section "Notes" — for each gap, render "[{importance}] {name} — {suggestedAction}".
- Footer (small grey): "Generated by Resume Shapeshifter. Please verify all content before sending."

(2) CoverLetterPdf — props { result: TailoringResult, resumeText: string }. Single Letter portrait page, 11pt body. Layout:
- Top right: today's date in en-US long format ("January 5, 2026").
- Candidate name extracted from first non-empty line of resumeText, 14pt bold.
- 1 blank line.
- "Hiring Team at " + (result.jdSummary.company ?? "the Company")
- 1 blank line.
- "Subject: " + result.coverLetter.subject (bold, 11pt).
- 1 blank line.
- Body paragraphs: split result.coverLetter.body on "\n\n", render each as a separate paragraph with 10pt spacing between.
- 1 blank line.
- Signoff: "Sincerely," then candidate name.
- Tiny footer: "Generated by Resume Shapeshifter — verify before sending."

Then export:
- async function renderTailoredResumeBuffer(result, resumeText): Promise<Buffer> — uses renderToBuffer.
- async function renderCoverLetterBuffer(result, resumeText): Promise<Buffer> — uses renderToBuffer.

FILE — src/app/api/generate-pdf/route.ts
- `export const runtime = "nodejs"`
- `export const maxDuration = 60`
- POST. Body: { type: "resume" | "cover-letter", result: TailoringResult, resumeText: string }.
- Validate body. If type === "resume": call renderTailoredResumeBuffer, return PDF with filename "Tailored_Resume.pdf". If type === "cover-letter": call renderCoverLetterBuffer, return PDF with filename `Cover_Letter_${sanitize(result.jdSummary.company ?? "Role")}.pdf` where sanitize replaces non-alphanumeric chars with underscores.
- Response headers: Content-Type "application/pdf", Content-Disposition `attachment; filename="<the filename>"`.

FILE — src/app/page.tsx
"use client". This is the ENTIRE app UI. Target ~280 lines max. Imports useState, useEffect, the store hook, the hydration hook, and lucide-react icons: Sparkles, FileText, Mail, Loader2, ArrowRight, RotateCcw.

State management:
- Local useState<"input" | "loading" | "results" | "error">("input").
- Local useState<string | null> for errorMessage.
- Read { result, resumeText, jdText, setResult, clear } from the persisted store.
- Use useHasHydrated() — if not hydrated, render null.
- After hydration, useEffect: if store.result exists, automatically setUiState("results") (this is the persistence wow — close the tab, reopen, instantly back where you were).
- Local controlled inputs for resume and JD textareas, defaulting to store values.

Header (always visible at top of page):
- Sparkles icon + "Resume Shapeshifter" title in indigo.
- Below the header, a small footer line: "Powered by Groq + Llama 3.3 70B. Need a free key? console.groq.com/keys".

INPUT state UI:
- Two large textareas, side by side on desktop (lg:grid-cols-2), stacked on mobile. 12 rows each. Labels "Paste your resume" and "Paste the job description".
- Each textarea dark-styled: bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-zinc-100, focus:ring-indigo-500.
- Big primary button below: "✨ Analyze with AI". Disabled while either textarea has < 50 trimmed chars.
- On click: trim both, switch to "loading" state, POST to /api/tailor with { resumeText, jdText }. On success setResult(data, resumeText, jdText) and switch to "results". On HTTP non-2xx or success:false, set errorMessage and switch to "error".

LOADING state UI:
- Centered card with Loader2 spinning + "AI is tailoring your resume and writing your cover letter… (10-25 seconds)".

ERROR state UI:
- Centered red card (bg-red-950 border border-red-800) with the errorMessage and a "Try Again" button that returns to "input".

RESULTS state UI (only when store.result is set):
- Top bar: "Start Over" button (RotateCcw icon) that calls store.clear() and switches to "input".
- Score widget card: two big numbers side by side — "Original: {result.score.original} / 100" and "Tailored: {result.score.tailored} / 100" with an ArrowRight between them. Below, the explanation paragraph in grey.
- JD Summary card: jobTitle large + company smaller + required skills as small Tailwind chips (rounded-full bg-zinc-800 px-3 py-1 text-xs).
- "Tailored Bullets" section: heading + grid of cards (1 col mobile, 2 col on lg:). Each card:
    Small grey label "Original" + original text in faded zinc-500
    Small green label "Tailored" + tailored text in white
    Italic line "Why: {changeReason}"
    Confidence dot (green/amber/red 8px circle) + the word "high"/"medium"/"low"
- "Gaps" section: heading + vertical list of rows. Each row: importance colored dot + name (bold) + " — " + suggestedAction (grey).
- "Cover Letter" section: heading + card showing:
    Subject in bold
    Body as preformatted text with whitespace-pre-wrap preserving paragraph breaks
    Two buttons: "Copy to Clipboard" (copies "Subject: <subject>\n\n<body>") and "Download PDF" (POST /api/generate-pdf with type "cover-letter").
- Action bar at the very bottom: one large primary button "📄 Download Tailored Resume PDF" (POST /api/generate-pdf with type "resume", read response as blob, trigger download via URL.createObjectURL + a temporary <a> click).

Styling rules:
- Body: bg-zinc-950 text-zinc-100 (dark mode default, no toggle).
- Cards: rounded-2xl border border-zinc-800 bg-zinc-900 p-6.
- Primary buttons: rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-white px-6 py-3 font-semibold transition.
- Secondary buttons: rounded-xl border border-zinc-700 hover:border-zinc-500 text-zinc-200 px-4 py-2.
- Use Tailwind utility classes inline. NO custom CSS beyond what globals.css contains.

FILE — src/app/layout.tsx
Standard Next.js root layout. metadata = { title: "Resume Shapeshifter", description: "AI-powered JD-to-resume tailoring" }. Import globals.css. Use Inter from next/font/google applied to <body>.

FILE — src/app/globals.css
Tailwind v4 directive `@import "tailwindcss";` plus a body base: `body { background-color: #09090b; color: #f4f4f5; }`. Nothing else.

============================================================
ANTI-ERROR RULES — DO NOT VIOLATE
============================================================
1. "use client" goes on src/app/page.tsx and src/lib/store.ts only. Nothing else needs it.
2. API routes have `export const runtime = "nodejs"`.
3. Do NOT import groq-sdk or @react-pdf/renderer in a client component. They are server-side only.
4. Use Zod's .safeParse, not .parse. Always handle the !success branch.
5. Read store from page.tsx only AFTER useHasHydrated() returns true. Render null before that.
6. NO file uploads. NO pdf-parse. NO mammoth. NO multer.
7. NO SSE. NO streaming. Just simple POST/JSON.
8. NO agent loops. NO tool calling. ONE LLM call per submission.
9. TypeScript strict mode. No `any`. Use `z.infer<typeof Schema>` for types.
10. Total files generated should be approximately 10 hand-written source files. Do NOT split into more files than necessary. Do NOT create extra "lib helper" or "utils" or "constants" files that are not specified above.

============================================================
VERIFICATION — RUN BEFORE REPORTING DONE
============================================================
1. `npx tsc --noEmit` → zero errors.
2. `npm run build` → clean.
3. `npm run dev` → opens http://localhost:3000.

Then a manual test (the user will paste a real Groq key into .env.local and restart the dev server):
4. Open http://localhost:3000. The input state is visible with two textareas.
5. Paste any real resume text + any real JD text. Click "Analyze with AI".
6. Loading state shows for ~15-25 seconds.
7. Results state appears with: score widget, JD summary, 3-6 tailored bullet cards, 1-4 gap rows, and the cover letter section.
8. Click "Download Tailored Resume PDF" → a PDF downloads and opens cleanly.
9. Click "Download PDF" on the Cover Letter card → a separate PDF downloads and opens.
10. Click "Copy to Clipboard" on the cover letter → paste somewhere to confirm.
11. Close the browser tab. Reopen http://localhost:3000 — the results state is still there (persistence works) and no new /api/tailor call is made.
12. Click "Start Over" → returns to input state with empty fields.

WHEN YOU FINISH, OUTPUT:
1. A 1-paragraph summary of what was built.
2. A list of every file created or modified.
3. Confirmation that tsc, build, and dev all pass cleanly.
4. The exact 9-step manual test plan above.
```

### ✅ Verification Checklist

After the prompt finishes:

- [ ] `npm run dev` opens http://localhost:3000 with no console errors
- [ ] `npx tsc --noEmit` and `npm run build` are clean
- [ ] Total hand-written source files in `src/` are ~10 (count them — if 15+, ask the agent to consolidate)
- [ ] Pasting resume + JD + Analyze returns real results in 15-25 seconds
- [ ] Score widget shows two real numbers + explanation
- [ ] At least 3 tailored bullet cards render
- [ ] Cover letter section shows a real personalized letter
- [ ] Tailored Resume PDF downloads and opens correctly
- [ ] Cover Letter PDF downloads and opens correctly
- [ ] Copy-to-clipboard button works for the cover letter
- [ ] Closing the browser tab and reopening keeps everything visible (persistence works)
- [ ] No second `/api/tailor` call is made on reload (check DevTools Network tab)

---

## Token Budget — Why This Stays Free-Tier Safe

| Metric | Old multi-prompt design | **Single-prompt build** |
|---|---|---|
| Prompts the IDE agent processes | 3 | **1** |
| Files generated | ~60 | **~10** |
| LLM API calls per user session | 8-14 | **1** |
| Prompt text length (chars to paste) | ~12,000 × 3 | **~3,200 × 1** |
| Inter-prompt re-read phases | 2 (heavy) | **0** |

The biggest win is **zero re-read phases**. Multi-prompt builds force the IDE agent to re-read every file from the previous prompt to understand the existing project before adding new code. With one prompt, that doesn't happen.

---

## Troubleshooting (workshop-day cheat sheet)

| Symptom | Fix |
|---|---|
| `npm run dev` says port 3000 in use | `npx next dev -p 3001` |
| "Add your Groq API key" message persists after pasting | Ctrl+C the dev server and `npm run dev` again |
| Groq returns 401 | Re-copy the key from https://console.groq.com/keys |
| Groq returns 429 | Wait 30 seconds; the retry handles transient ones |
| LLM returns invalid JSON twice in a row | Restart the dev server, try again. If it still fails, lower temperature by editing `temperature: 0.3` → `0.1` in `src/lib/groq.ts` |
| PDF download fails | Confirm `export const runtime = "nodejs"` is on `src/app/api/generate-pdf/route.ts` |
| Page goes blank after reload | The hydration guard is missing — confirm `useHasHydrated()` is called before reading the store |
| IDE agent stops responding mid-prompt | Click into the chat and send "continue" — both Cursor and Antigravity resume cleanly |
| Agent over-engineered (15+ files) | Tell it: "consolidate — the spec requires ~10 files only. Merge helper files." |

---

## What Students Walk Out With

Every participant has, on their laptop:

1. A Next.js + Groq AI app running at `localhost:3000`
2. A working resume tailoring engine — paste, analyze, score, side-by-side comparison
3. A working personalized cover letter generator
4. **Two downloadable PDFs:** tailored resume + cover letter
5. **Copy-to-clipboard ready cover letter** for emails or LinkedIn
6. A persisted session — close the laptop, reopen tomorrow, everything is still there
7. A real portfolio-grade project they can put on their GitHub and resume

## The Pitch Line

> *"Paste a resume. Paste a job description. In 20 seconds, our AI rewrites your resume for that job, scores the match, finds your gaps, and writes you a personalized cover letter. Built in 90 minutes. Free forever. Your laptop. Your data."*

That's the workshop. One prompt. One LLM call per session. Free-tier safe.

🎤
