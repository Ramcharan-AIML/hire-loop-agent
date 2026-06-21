# Resume Shapeshifter — Workshop Kit (90 minutes · 50 participants)

> **One-line vision:** Give 50 people three prompts. Ninety minutes later, every one of them walks away with a deployed, AI-powered JD-to-Resume tailoring web app — built end-to-end with Claude Code + Groq, for $0.

This document is the complete workshop playbook. Read it once end-to-end, then test the three prompts yourself in a clean folder before the event. Everything you need to run the session is here.

---

## 1. The Approach — Why 3 Prompts (and how I'd actually slice them)

The implementation plan in `docs/implementation-plan.md` is 5 phases. Collapsing those 5 phases into 3 prompts gives a clean narrative arc the audience can follow, with three "wow" moments:

| Prompt | Covers | Audience sees… | Approx. Claude Code run time |
|---|---|---|---|
| **Prompt 1 — "The Brain & Body"** | Phase 1 (UI shell, Zod schemas, mock data) **+** Phase 2 (Groq LLM pipeline, all 5 API routes, live analysis) | A working app that parses resume+JD, scores it, and rewrites bullets with real AI | 8-15 min |
| **Prompt 2 — "The Shield & The Proof"** | Phase 3 (truthfulness guardrails) **+** Phase 4 (two PDF exports with diff highlighting) | The app now flags fabrications and exports a beautiful side-by-side PDF | 6-12 min |
| **Prompt 3 — "The Launch"** | Phase 5 (landing page, one-click demo, error states, Vercel-ready) | A polished, demo-able product they can deploy to Vercel for free | 5-10 min |

**Why not 5 prompts?** Audience attention drops after 3 context switches. Three prompts = three distinct "magic moments" with breathing room between them. Three is the sweet spot for a 90-minute live build.

**Why this particular split?**
- Prompt 1 ends with the first "It works! AI is actually rewriting my resume!" moment — this is the hook.
- Prompt 2 ends with the first downloadable PDF — this is the deliverable.
- Prompt 3 ends with a deployable product — this is the takeaway.

---

## 2. The 90-Minute Schedule (minute-by-minute)

| Time | Block | What you do | What participants do |
|---|---|---|---|
| **0–8** | **Hook & demo** | Show the finished app live (your pre-built copy). Tailor a real resume against a real JD. Download the PDF. Show the score jump (e.g., 52 → 88). | Watch. Get excited. |
| **8–18** | **Prerequisites check + Groq key** | Walk them through Section 3 below. Have them paste their Groq key into `.env.local`. | Install Node, VS Code, Claude Code, clone starter repo, get Groq key. |
| **18–22** | **Prompt 1 briefing** | Explain what Prompt 1 will build (UI + Schemas + Live AI pipeline). Have everyone paste it into Claude Code and run. | Paste Prompt 1, hit enter, watch Claude Code work. |
| **22–35** | **Prompt 1 execution + teach-while-waiting** | While Claude Code runs (~10 min), teach: what a Zod schema is, what a Next.js App Router route is, why we use a 6-stage LLM pipeline (show `docs/architecture.md` Section 6 diagram). | Watch Claude Code generate code. Ask questions in chat. |
| **35–40** | **Run Prompt 1 output** | All run `npm run dev`, open `localhost:3000`, paste a sample resume + JD, click Analyze. First "It works!" moment. | Test. Cheer. |
| **40–43** | **Prompt 2 briefing** | Explain guardrails (Architecture §7) and the side-by-side PDF (Architecture §8). | Paste Prompt 2, run. |
| **43–55** | **Prompt 2 execution + teach** | While it runs, teach: why fabrication guardrails matter (real-world hiring ethics), how diff highlighting works, why we generate TWO PDFs (clean resume + proof report). | Watch, then test guardrails by trying to inject a fake skill. |
| **55–60** | **Download PDFs** | Everyone exports their side-by-side PDF. Second "It works!" moment. | Share PDFs in chat. |
| **60–63** | **Prompt 3 briefing** | Explain: polish, landing page, one-click demo, Vercel deploy. | Paste Prompt 3, run. |
| **63–73** | **Prompt 3 execution + teach** | While it runs, walk them through deploying to Vercel (Section 6). | Watch Claude Code. Create Vercel account. |
| **73–82** | **Deploy to Vercel** | Walk through `vercel` CLI or GitHub import. Everyone deploys their version. Third "It works!" moment. | Deploy. Share links in chat. |
| **82–90** | **Q&A + portfolio framing** | Show them how to put this on their resume/LinkedIn/portfolio. Show them the gallery of 50 deployed apps. | Ask questions. Network. |

**Buffer strategy:** If Claude Code finishes a prompt early, you have more teach time. If it runs long, drop the deepest theory bit. Always protect the "run the app" moments — those are the dopamine hits.

---

## 3. Prerequisites — Everything Free, Zero Cost

Send this list to all 50 participants **2 days before** with a "please verify before you arrive" instruction. Recovering one straggler at the event costs 10 minutes of the room's time.

### 3.1 Must install (verify with the listed command)

| Tool | Why | Install | Verify |
|---|---|---|---|
| **Node.js ≥ 20 LTS** | Runs Next.js | https://nodejs.org/ (LTS installer) | `node -v` should print v20.x or higher |
| **Git** | Clone the starter repo | https://git-scm.com/downloads | `git --version` |
| **VS Code** | Code editor + houses Claude Code extension | https://code.visualstudio.com/ | Opens |
| **Claude Code** | The AI that runs the prompts | `npm install -g @anthropic-ai/claude-code` then `claude` (or use the VS Code extension) | `claude --version` |
| **A modern browser** | Test the app | Chrome / Edge / Firefox (latest) | — |

### 3.2 Must create (free accounts)

| Account | Why | Where | Cost |
|---|---|---|---|
| **Groq Console** | Free LLM API (Llama 3.3 70B) | https://console.groq.com/ → sign in → API Keys → Create Key | **Free** — generous daily quota |
| **GitHub** | Push code, import to Vercel | https://github.com/signup | Free |
| **Vercel** | Deploy the app to the public internet | https://vercel.com/signup → sign in with GitHub | Free Hobby tier |
| **Anthropic account** (for Claude Code) | Authenticates Claude Code | Created when you log in to `claude` for the first time | Free tier available |

### 3.3 Starter repo (you prepare this once, share the URL)

Create a public GitHub repo called `resume-shapeshifter-starter` containing **only**:

```
resume-shapeshifter-starter/
├── docs/
│   ├── ProblemStatement.md
│   ├── architecture.md
│   ├── implementation-plan.md
│   ├── deployment-plan.md
│   └── edge-cases/
│       ├── phase-1-edge-cases.md
│       ├── phase-2-edge-cases.md
│       ├── phase-3-edge-cases.md
│       ├── phase-4-edge-cases.md
│       └── phase-5-edge-cases.md
├── .env.example
├── .gitignore
├── AGENTS.md
└── README.md   ← Quick "clone, install Claude Code, paste Prompt 1" instructions
```

That's it. No `src/`, no `package.json`, no `node_modules`. Claude Code will generate everything from the docs.

Participants run:

```bash
git clone https://github.com/<your-username>/resume-shapeshifter-starter.git my-resume-app
cd my-resume-app
code .                    # opens VS Code
# create .env.local from .env.example, paste their Groq key
claude                    # launches Claude Code in this directory
```

Then they paste Prompt 1.

### 3.4 The `.env.local` file (have them create before Prompt 1)

```bash
LLM_PROVIDER=groq
GROQ_API_KEY=gsk_paste_your_key_here
LLM_MODEL=llama-3.3-70b-versatile
LLM_TEMPERATURE=0.3
LLM_MAX_RETRIES=3
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 4. The Three Prompts (copy-paste, verbatim)

These are the actual prompts participants will paste into Claude Code. Each one is self-contained and explicitly tells Claude Code to read `docs/` as the source of truth — that's why the starter repo ships with the full docs folder.

Test all three end-to-end yourself in a clean folder before the workshop. Allow ~30 minutes for the full dry run.

---

### 🟪 PROMPT 1 — "The Brain & Body" (Phases 1 + 2)

```
You are building "Resume Shapeshifter" — a JD-to-Resume tailoring web app using Next.js 16 + React 19 + TypeScript + Tailwind CSS v4 + Zod 4 + Groq SDK.

CRITICAL — READ THESE DOCS FIRST, IN THIS ORDER, BEFORE WRITING ANY CODE:
1. docs/ProblemStatement.md — what the product does (all 20 sections)
2. docs/architecture.md — system architecture, all 6 Zod schemas, the 6-stage LLM pipeline (Sections 5 and 6 are mandatory)
3. docs/implementation-plan.md — Phases 1 and 2 only (you will implement Phases 3-5 in later prompts)
4. docs/edge-cases/phase-1-edge-cases.md and docs/edge-cases/phase-2-edge-cases.md — handle these edge cases as you implement
5. AGENTS.md — note the warning that this is Next.js 16 (App Router, breaking changes from older versions). Consult node_modules/next/dist/docs/ if you are unsure about any Next.js 16 API.

YOUR GOAL FOR THIS PROMPT — Implement Phase 1 (The Sandbox) AND Phase 2 (The Pipeline) completely.

PHASE 1 deliverables (must build):
- Initialize a fresh Next.js 16 project IN-PLACE in the current directory (App Router, TypeScript, Tailwind v4, src/ dir, @/* alias). Do NOT create a subdirectory.
- Install dependencies: zod@4, zustand, groq-sdk, @google/generative-ai, pdf-parse, mammoth, framer-motion, lucide-react, clsx, tailwind-merge, class-variance-authority, diff, @types/diff, @react-pdf/renderer.
- Build the dark-mode design system in src/app/globals.css using the CSS custom properties from implementation-plan.md §1.2.
- Implement ALL Zod schemas under src/lib/schemas/ exactly as defined in architecture.md §5 (resume, job-description, match-score, tailored-resume, gap-analysis, tailoring-run, plus a barrel index.ts).
- Build all input components: ResumeInput (with tabbed paste/upload), JDInput, FileUploader (drag-and-drop, .pdf/.docx, 5MB limit), TextareaWithCounter.
- Build the analysis + review components: ScoreCard (animated gauge 0→target), ScoreComparison, JDSummaryCard, GapAnalysisPanel, SideBySideDiff, BulletComparison, ConfidenceBadge.
- Build the AppShell, Navbar, StepIndicator layout components.
- Build the Zustand store at src/lib/store/tailoring-store.ts that holds the TailoringRun session.
- Build all 5 pages: src/app/page.tsx (landing), src/app/input/page.tsx, src/app/analyze/page.tsx, src/app/review/page.tsx, src/app/export/page.tsx.
- Wire the pages with mock data from src/lib/mock-data/ so the app is navigable end-to-end before any LLM call.

PHASE 2 deliverables (must build):
- Create the provider-agnostic LLM client at src/lib/llm/client.ts with a generateStructuredOutput<T>(prompt, schema) method. Retry 3 times with exponential backoff. Validate every response with Zod. The Groq adapter (src/lib/llm/providers/groq.ts) uses groq-sdk with model "llama-3.3-70b-versatile" by default and respects the LLM_TEMPERATURE env var. Also stub the gemini adapter for parity.
- Build all 5 prompt templates under src/prompts/ exactly as architecture.md §6 describes: jd-extraction.ts, resume-parser.ts, match-scoring.ts, bullet-rewriter.ts, gap-analysis.ts. The bullet-rewriter prompt MUST include the 4 truthfulness rules from architecture.md §7 verbatim. Every prompt must demand strict JSON output that matches its corresponding Zod schema.
- Build all 5 API routes under src/app/api/: parse-resume, parse-jd, score, tailor, gap-analysis. Each route accepts JSON, calls the LLM client, validates the response, and returns { success, data } or { success: false, error }. The parse-resume route also accepts multipart/form-data with a file field and uses pdf-parse / mammoth to extract text before sending to the LLM.
- Build the frontend orchestrator at src/lib/api/orchestrator.ts that runs the 6-stage pipeline IN ORDER: parse-resume → parse-jd → score (original) → tailor → gap-analysis → score (tailored). Stream progress events back so the UI can show stage progress.
- Build a LoadingOverlay component that shows the current pipeline stage ("Parsing resume…", "Scoring match…", etc.).
- Replace the mock-data wiring in the Input → Analyze → Review pages with calls to the orchestrator.

NON-NEGOTIABLE RULES:
- Use Next.js 16 App Router conventions (server components by default, "use client" only where state/effects are needed).
- TypeScript strict mode. No `any` types in business logic.
- Every LLM-call output MUST pass Zod validation; on failure, retry with the same prompt up to 3 times.
- Keep all prompts in separate files under src/prompts/ — never inline them in API routes.
- No real API keys in code. Read from process.env.
- Handle the edge cases in docs/edge-cases/phase-1-edge-cases.md and docs/edge-cases/phase-2-edge-cases.md as you go.
- After the build completes, run `npm run dev` mentally to confirm the app starts cleanly. List any environment variables the user must set before running.

WHEN YOU FINISH, OUTPUT:
1. A one-paragraph summary of what you built.
2. The exact command the user runs to start the app (`npm run dev`).
3. A 4-step manual test the user can perform to confirm Phase 1 + Phase 2 work end-to-end with their Groq key.

Start by reading the docs. Do not skip ahead.
```

---

### 🟦 PROMPT 2 — "The Shield & The Proof" (Phases 3 + 4)

```
Continue building "Resume Shapeshifter". The Phase 1 + Phase 2 scaffolding (UI, schemas, LLM pipeline, all 5 API routes) is already in place from the previous prompt.

CRITICAL — READ THESE DOCS FIRST, IN THIS ORDER, BEFORE WRITING ANY CODE:
1. docs/architecture.md §7 (Truthfulness Guardrails) and §8 (Side-by-Side Proof PDF Design) — these define what you are about to build.
2. docs/implementation-plan.md — Phases 3 and 4 only.
3. docs/edge-cases/phase-3-edge-cases.md and docs/edge-cases/phase-4-edge-cases.md.

THEN inspect what already exists:
- src/lib/schemas/ (do not modify the existing schemas; you may extend them with optional guardrail fields)
- src/app/review/page.tsx (you will enhance this)
- src/app/export/page.tsx (you will replace its body)
- src/lib/store/tailoring-store.ts (you may add guardrail state here)

PHASE 3 deliverables — The Shield (truthfulness guardrails):
- src/lib/guardrails/entity-checker.ts — Implements checkEntityIntersection(original: ResumeProfile, tailored: TailoredResume): EntityViolation[]. Extracts all named entities (skills, tools, technologies, certifications) from the original resume. Compares against the tailored resume. Any entity in tailored but NOT in original is flagged with severity "high" (technologies/tools/certs) or "low" (soft skills). Pure string/set logic — NO LLM CALL. Must run in <50ms.
- src/lib/guardrails/numeric-checker.ts — Implements checkNumericFabrication(originalBullets: string[], tailoredBullets: TailoredBullet[]): NumericViolation[]. Regex-extracts all numbers (with units like %, K, M, x, +). Flags any number appearing in a tailored bullet that did not appear in the corresponding original bullet. Exclude version numbers (e.g., "React 18") and 4-digit years from detection.
- src/lib/guardrails/types.ts — Shared types: EntityViolation, NumericViolation, GuardrailResult, GuardrailSeverity ("high" | "medium" | "low" | "safe").
- Wire the guardrail checks into the orchestrator AFTER the tailor step and BEFORE the user sees the review page. Attach results to the TailoringRun.
- Enhance src/components/review/BulletComparison.tsx to display violations: left-border color (red/amber/blue/green), risk banner with icon and message, and an "I confirm this is accurate" checkbox per flagged bullet.
- New component src/components/review/RiskBanner.tsx — inline warning with confirm checkbox.
- New component src/components/review/GuardrailSummary.tsx — top-of-review-page aggregate showing "X high-risk · Y medium · Z low" with a "Confirm all" affordance.
- New component src/components/review/ConfirmationModal.tsx — blocks the "Continue to Export" button when any high-risk flag is unconfirmed; lists each unresolved flag with its bullet excerpt.

PHASE 4 deliverables — The Proof (PDF export):
- src/lib/pdf/styles.ts — Shared @react-pdf/renderer StyleSheet (fonts, colors, spacing, margins).
- src/lib/pdf/fonts.ts — Register Inter (or another professional sans-serif) for @react-pdf/renderer.
- src/lib/pdf/tailored-resume-template.tsx — React component using @react-pdf/renderer that renders the tailored resume as a clean, single-column, ATS-friendly portrait Letter-size PDF (layout per implementation-plan.md §4.1).
- src/lib/pdf/proof-report-template.tsx — Landscape Letter-size PDF showing the side-by-side comparison (layout per architecture.md §8 and implementation-plan.md §4.2). Includes header with job title/company, before→after score band, JD requirements summary, two-column bullet comparison with diff highlighting, gap analysis section, and the disclaimer footer from architecture.md §7.4.
- src/lib/pdf/diff-engine.ts — computeWordDiff(original: string, tailored: string): DiffSegment[]. Use the `diff` npm package (already installed). Returns segments tagged "unchanged" | "added" | "removed".
- src/lib/pdf/DiffHighlightedText.tsx — @react-pdf/renderer component that renders DiffSegment[] with the color scheme from implementation-plan.md §4.3 (removed = red strikethrough, added = green background).
- src/app/api/generate-pdf/route.ts — POST handler accepting { tailoringRun, pdfType: "resume" | "proof" }. Uses @react-pdf/renderer renderToStream / renderToBuffer to produce the PDF. MUST include `export const runtime = "nodejs"` (Vercel requires this — see deployment-plan.md).
- Rebuild src/app/export/page.tsx as two PDFPreviewCard components ("Tailored Resume" and "Proof Report"), each with a DownloadButton showing a loading state during generation. Filenames: `<CandidateName>_Tailored_Resume_<Company>.pdf` and `<CandidateName>_Proof_Report_<Company>.pdf`.

NON-NEGOTIABLE RULES:
- The guardrails MUST run deterministically (no LLM). They are the safety net under the LLM.
- The proof PDF MUST include the disclaimer text from architecture.md §7.4 verbatim.
- All numeric metrics in tailored bullets MUST match a metric in the corresponding original bullet — if not, the bullet is flagged.
- The "Continue to Export" button MUST be disabled until all high-risk flags are confirmed (with an override option that requires an additional confirmation modal).
- Do not break any Phase 1 / Phase 2 functionality. The full pipeline must still complete end-to-end.

WHEN YOU FINISH, OUTPUT:
1. A one-paragraph summary of the guardrail and PDF systems.
2. A 3-step manual test: (a) trigger a fabrication (e.g., a tailored bullet adding "Kubernetes"), (b) confirm the red flag appears, (c) confirm the user is blocked from export until they review it.
3. Confirm both PDFs download with the correct filenames.
```

---

### 🟩 PROMPT 3 — "The Launch" (Phase 5 + Vercel-ready)

```
Continue building "Resume Shapeshifter". Phases 1-4 are complete: the app has a working UI, live Groq-powered LLM pipeline, truthfulness guardrails, and two downloadable PDFs.

CRITICAL — READ THESE DOCS FIRST:
1. docs/implementation-plan.md — Phase 5 only.
2. docs/edge-cases/phase-5-edge-cases.md.
3. docs/deployment-plan.md — your build must satisfy every Vercel readiness requirement listed there.

YOUR GOAL — Take the functional prototype and turn it into a polished, demo-ready, deployable product.

DELIVERABLES — Phase 5 (Polish, Demo, Launch):

1. Loading + error UX (implementation-plan.md §5.1):
   - src/components/ui/SkeletonCard.tsx — shimmer skeleton matching card layouts.
   - src/components/ui/StageProgress.tsx — pipeline stage indicator with check/spinner/blank states for each of the 6 stages.
   - src/components/ui/ErrorBoundary.tsx — React error boundary with retry.
   - src/components/ui/ErrorCard.tsx — inline error card with user-friendly message + suggested action (mapping per the Error Handling Matrix in implementation-plan.md §5.1).
   - src/app/error.tsx — Next.js global error page.
   - src/app/not-found.tsx — custom 404.

2. One-click demo (implementation-plan.md §5.2):
   - src/lib/demo/sample-resume.ts — realistic 2-page software engineer resume (3 jobs, 2 projects, skills, education) as a plain string ready to feed the parse-resume API.
   - src/lib/demo/sample-jd.ts — realistic ~400-word Senior Frontend Engineer JD (≥8 required skills, ≥5 preferred) as a plain string.
   - Add a "Try Demo" button on the landing page that pre-fills both inputs, navigates to /input, and auto-triggers the orchestrator.
   - Demo must produce a score improvement of ≥15 points (verify by running it).

3. Landing page polish (implementation-plan.md §5.3):
   - Rebuild src/app/page.tsx with: hero (product name, tagline, animated gradient background using framer-motion, two CTAs — "Get Started" and "Try Demo"); "How It Works" 4-step visual (Upload → Analyze → Review → Export) with scroll-triggered entrance animations; 3 feature cards (Match Scoring, Truthful Tailoring, Gap Analysis) with hover micro-animations; mini before/after preview teaser; footer with disclaimer and GitHub link placeholder.
   - Verify responsiveness at 375px, 768px, 1280px breakpoints (no horizontal scroll at any size).

4. Vercel deployment readiness (deployment-plan.md):
   - Ensure src/app/api/generate-pdf/route.ts has `export const runtime = "nodejs"` and `export const maxDuration = 60`.
   - Add a vercel.json with the maxDuration override for /api/** routes.
   - Update .env.example to document every required variable.
   - Update README.md with: project description, prerequisites, local setup, environment variables table, and a "Deploy to Vercel" section with one-click button markup and CLI instructions.
   - Confirm `npm run build` completes with zero errors and zero TypeScript errors.

5. Final QA checklist — manually verify before reporting done:
   - [ ] Landing page → "Try Demo" → pipeline runs → review shows guardrail flags → user confirms → both PDFs download.
   - [ ] Same flow with user's own pasted resume + JD works.
   - [ ] Score improves by ≥15 points on the demo data.
   - [ ] No console errors in the browser.
   - [ ] No TypeScript errors (`npx tsc --noEmit` is clean).
   - [ ] `npm run build` succeeds.
   - [ ] Mobile (375px) layout has no horizontal scroll on any page.

NON-NEGOTIABLE RULES:
- Do not regress any Phase 1-4 behavior.
- Every async UI must have a loading state and an error state.
- The landing page must load in under 2 seconds on a fast connection (no large unoptimized images).
- All filenames, component names, and routes from previous phases stay stable.

WHEN YOU FINISH, OUTPUT:
1. A one-paragraph summary of the polish work.
2. The exact Vercel deployment steps (CLI or GitHub import — both).
3. A final checklist confirming each item in section 5 above passes.
```

---

## 5. What to Teach While Claude Code Is Running

Claude Code runs the prompts silently for 5-15 minutes each. That's your teaching time. Here are punchy 3-minute mini-lessons that map to what's happening on screen.

### During Prompt 1 (≈10 min of fill time)

| Mini-lesson | Why it sticks |
|---|---|
| **"What is a Zod schema?"** — Show `src/lib/schemas/resume.ts` once it's written. Point at one field. "This single line guarantees the LLM gives us back exactly this shape, or we retry." | Most have never seen runtime type validation. Big a-ha. |
| **"Why 6 LLM stages instead of one big prompt?"** — Show the architecture.md §6 diagram. "Context drowning. Smaller prompts = better JSON compliance = fewer retries = cheaper + faster." | Frames the entire design philosophy. |
| **"Why Groq?"** — Llama 3.3 70B at ~280 tokens/sec, generous free tier, OpenAI-compatible SDK. Show their console. | Justifies the "free" promise. |

### During Prompt 2 (≈8 min of fill time)

| Mini-lesson | Why it sticks |
|---|---|
| **"Why guardrails matter"** — Tell a real story: "ATS gets your resume. Hiring manager sees 'Kubernetes' on it. Asks you about it in the interview. You've never used Kubernetes." Hiring ethics → personal ethics. | Emotional weight. They'll remember this for life. |
| **"Deterministic vs. probabilistic"** — The LLM is probabilistic; the guardrails are deterministic. Both are needed. Defense in depth. | Real software-architecture lesson. |
| **"Why two PDFs?"** — The clean tailored resume is what you submit. The proof report is what YOU keep, to prove to yourself that nothing was fabricated. | Reframes the product. |

### During Prompt 3 (≈8 min of fill time)

| Mini-lesson | Why it sticks |
|---|---|
| **"How Vercel works"** — Push to GitHub → Vercel auto-builds → public URL. Show your dashboard. | Demystifies "deployment." |
| **"What goes on your resume"** — "Built an AI-powered resume tailoring app with Next.js 16, React 19, Groq LLM, truthfulness guardrails, and PDF generation. Deployed on Vercel. [Live demo link]." | This is what they paid for — the portfolio line. |
| **"Where to go from here"** — Add cover letter generation. Add LinkedIn URL parsing. Add a database. Each is one more prompt. | Plants the seed for continued learning. |

---

## 6. Vercel Deploy — Live Walkthrough Script (≈7 min)

Best path for 50 people: **GitHub Import** (no CLI surprises).

1. Each participant pushes their generated code to a NEW GitHub repo (Claude Code can do this for them with `git init && git add . && git commit -m "Initial" && gh repo create --public --source=. --push`).
2. Open https://vercel.com/new in their browser.
3. Click "Import" next to the new repo.
4. Framework Preset: Next.js (auto-detected). Leave defaults.
5. Expand **Environment Variables**. Add:
   - `LLM_PROVIDER` = `groq`
   - `GROQ_API_KEY` = (their key)
   - `LLM_MODEL` = `llama-3.3-70b-versatile`
   - `NEXT_PUBLIC_APP_URL` = (leave blank, set after first deploy)
6. Click **Deploy**. Wait ~90 seconds.
7. Copy the generated `*.vercel.app` URL.
8. (Optional) Update `NEXT_PUBLIC_APP_URL` env var to that URL, redeploy.

**Backup plan if Vercel is slow:** keep the demo on `localhost` — the workshop is about building, not about deployment. Mention deploy as a "homework" if time runs short.

---

## 7. Troubleshooting Cheat Sheet (laminate this)

| Symptom | Cause | Fix |
|---|---|---|
| `claude` command not found | npm global path issue | `npm install -g @anthropic-ai/claude-code` then restart terminal |
| `npm run dev` → `EADDRINUSE` port 3000 | Another app on 3000 | `npx next dev -p 3001` |
| Groq returns 401 | Wrong key or unsaved `.env.local` | Recheck key in console.groq.com, restart `npm run dev` after editing `.env.local` |
| Groq returns 429 | Rate limit on free tier | Wait 30s; retry built into LLM client should handle it |
| LLM response fails Zod validation 3 times | Model output drift | Lower `LLM_TEMPERATURE` to `0.1` and retry |
| PDF route times out on Vercel Hobby | 10s function limit | Confirm `export const maxDuration = 60` is set; Hobby tier caps at 10s but `nodejs` runtime + small payloads usually finish in time |
| `pdf-parse` errors on upload | Node version too old | Verify `node -v` ≥ 20 |
| Blank white page after Phase 3 | Guardrail wiring crash | Open browser console; look for the actual error; rerun Prompt 2 if needed |
| Diff highlighting not rendering in PDF | Font registration missing | Check `src/lib/pdf/fonts.ts` is imported by both templates |
| Claude Code says "I can't write files" | Permission mode | In Claude Code, switch to "auto-accept edits" or approve each write |

---

## 8. My Honest Recommendation vs. Your Plan

You asked: should it be 3 prompts, or more? Here's my take:

**3 prompts is correct for a live 90-minute workshop with 50 people.** Each prompt is a chapter; each chapter ends with a usable artifact (working AI app → downloadable PDF → deployed product). Three is the most you can fit in 90 minutes with teach-while-waiting blocks AND keep people engaged.

**However, for participants who want to continue at home**, I'd give them two BONUS prompts (which you don't run live, just hand out as a follow-up doc):

- **Bonus Prompt 4 — "Cover Letter Generator"** — Add a `/api/cover-letter` route and a new section on the export page. ~30 min at home.
- **Bonus Prompt 5 — "Save & Reload Sessions"** — Add a SQLite or Supabase free-tier persistence layer so users can revisit past tailoring runs. ~45 min at home.

That gives them a clear path beyond the workshop. It also seeds your next session: "Come back next month, we'll do Bonus Prompts together."

**One more thing — a workshop multiplier:** During Prompt 1 (the long one), have everyone tweet/post a screenshot of Claude Code running, tagging your handle and #ResumeShapeshifter. By the time the workshop ends, you've got 50 social-proof posts. (Optional — only if comfort with this fits your audience.)

---

## 9. Pre-Workshop Dry-Run Checklist (do this 24 hours before)

- [ ] Create the starter repo on GitHub (`resume-shapeshifter-starter`). Make it public. Verify the docs/ folder is intact.
- [ ] In a fresh empty folder on your machine, clone the starter, create `.env.local`, run Claude Code, paste **Prompt 1** verbatim. Time it. Confirm `npm run dev` works at the end.
- [ ] In the SAME folder, paste **Prompt 2** verbatim. Time it. Trigger a fabrication (paste a JD with "Kubernetes," see if it gets flagged). Download both PDFs. Open them.
- [ ] In the SAME folder, paste **Prompt 3** verbatim. Time it. Run `npm run build` — must be clean. Click "Try Demo" — must produce ≥15-point score improvement.
- [ ] Deploy your dry-run version to Vercel. Save the URL — you'll show it at minute 0 as the "here's what we're building" demo.
- [ ] Sanity-check this doc against what you actually built. If a prompt produced something different, update the prompt here.
- [ ] Prepare a backup `.zip` of the fully built project. If Claude Code fails for any participant mid-workshop, hand them the zip so they don't fall behind.

---

## 10. The Pitch Line (use this in your event marketing)

> **"Bring a laptop. Leave with a deployed AI app — built with three prompts, in 90 minutes, for $0."**

That's the promise. This kit is everything you need to deliver it.

Good luck. Tell me how it goes. 🎤
