# Phase 1 Edge Cases — The Sandbox (Ingestion & Core UI Layout)

> **Reference:** [Implementation Plan — Phase 1](../implementation-plan.md#phase-1-the-sandbox--ingestion--core-ui-layout)
>
> **Scope:** Project scaffolding, design system, Zod schemas, resume & JD input components, side-by-side preview (static mock), page routing & state management.

---

## 1. Project Scaffolding & Tooling

### EC-1.1: Node.js Version Incompatibility
| Field | Detail |
|-------|--------|
| **Trigger** | User's machine runs Node.js < 18.17 (minimum for Next.js 14) |
| **Symptom** | `npx create-next-app` fails or produces cryptic errors during install |
| **Handling** | Check `node --version` in a pre-init script. Display clear error: "Node.js ≥ 18.17 is required. Current version: X.Y.Z" |
| **Files Affected** | `package.json` (engines field), project README |

### EC-1.2: Port 3000 Already in Use
| Field | Detail |
|-------|--------|
| **Trigger** | Another dev server or process occupies port 3000 |
| **Symptom** | `npm run dev` fails with `EADDRINUSE` |
| **Handling** | Configure `next dev -p 3001` fallback in `package.json` scripts, or document manual override |
| **Files Affected** | `package.json`, `next.config.js` |

### EC-1.3: Missing Environment Variables at Startup
| Field | Detail |
|-------|--------|
| **Trigger** | `.env.local` is missing or `OPENAI_API_KEY` / `GOOGLE_API_KEY` is empty |
| **Symptom** | App starts but API routes will fail silently in Phase 2 |
| **Handling** | Add a startup validation utility (`src/lib/env.ts`) that checks required env vars and throws a descriptive error at build/dev time. In Phase 1 (no API calls), log a warning but don't crash. |
| **Files Affected** | `src/lib/env.ts`, `src/app/layout.tsx` |

### EC-1.4: Shadcn UI Init Fails Due to Tailwind Config
| Field | Detail |
|-------|--------|
| **Trigger** | `npx shadcn-ui@latest init` fails because `tailwind.config.ts` has an unexpected structure |
| **Symptom** | Shadcn components don't render or have broken styles |
| **Handling** | Run Shadcn init immediately after `create-next-app` before modifying `tailwind.config.ts`. Validate by rendering a `<Button>` component. |
| **Files Affected** | `components.json`, `tailwind.config.ts` |

### EC-1.5: Path Alias Resolution Failure
| Field | Detail |
|-------|--------|
| **Trigger** | `@/components/*`, `@/lib/*`, or `@/prompts/*` aliases don't resolve |
| **Symptom** | Import errors: "Module not found: Can't resolve '@/components/...'" |
| **Handling** | Verify `tsconfig.json` `paths` align with the `src/` directory structure. Ensure `baseUrl` is set to `"."` |
| **Files Affected** | `tsconfig.json` |

---

## 2. Design System & Global Layout

### EC-2.1: CSS Custom Properties Not Cascading
| Field | Detail |
|-------|--------|
| **Trigger** | Design tokens declared in `:root` are not applied inside Shadcn or Tailwind components |
| **Symptom** | Components render with wrong colors or fallback browser defaults |
| **Handling** | Ensure CSS custom properties are defined in `@layer base` within `globals.css`. Verify Tailwind's `theme.extend.colors` references the CSS vars correctly (e.g., `'bg-primary': 'var(--color-bg-primary)'`) |
| **Files Affected** | `src/app/globals.css`, `tailwind.config.ts` |

### EC-2.2: Glassmorphism Not Rendering on Firefox
| Field | Detail |
|-------|--------|
| **Trigger** | Firefox's `backdrop-filter` support requires explicit enabling in older versions |
| **Symptom** | `.glass-panel` appears as a solid opaque rectangle instead of frosted glass |
| **Handling** | Add `-webkit-backdrop-filter` prefix. Provide a solid fallback background (`background: var(--color-bg-surface)`) for browsers without support. Use `@supports (backdrop-filter: blur())` query. |
| **Files Affected** | `src/app/globals.css` |

### EC-2.3: Font Loading Failure (Google Fonts)
| Field | Detail |
|-------|--------|
| **Trigger** | Google Fonts CDN is blocked by corporate firewalls, ad blockers, or in offline mode |
| **Symptom** | UI renders with browser default fonts (Times New Roman / serif), breaking the design system |
| **Handling** | Use `next/font/google` with `display: 'swap'` for FOIT prevention. Define a robust fallback stack: `font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif` |
| **Files Affected** | `src/app/layout.tsx` |

### EC-2.4: Animation Performance on Low-End Devices
| Field | Detail |
|-------|--------|
| **Trigger** | Complex CSS animations (`shimmer`, `pulseGlow`, `fadeInUp`) cause jank on low-powered devices or when many elements animate simultaneously |
| **Symptom** | Sluggish scrolling, dropped frames, battery drain on mobile |
| **Handling** | Respect `prefers-reduced-motion: reduce` media query — disable or simplify all animations. Use `will-change` sparingly. Limit simultaneous animated elements to < 10. |
| **Files Affected** | `src/app/globals.css`, all components with animations |

### EC-2.5: Step Indicator Shows Wrong Active Step
| Field | Detail |
|-------|--------|
| **Trigger** | User navigates via browser back/forward buttons instead of in-app navigation |
| **Symptom** | Step indicator highlights "Analyze" but user is on "Input" page |
| **Handling** | Derive active step from the current `pathname` using `usePathname()` hook, not from a stored state variable. The indicator should be a pure function of the URL. |
| **Files Affected** | `src/components/layout/StepIndicator.tsx` |

### EC-2.6: Layout Overflow on Extremely Small Viewports
| Field | Detail |
|-------|--------|
| **Trigger** | Viewport width < 320px (e.g., Galaxy Fold closed, accessibility zoom) |
| **Symptom** | Horizontal scrollbar appears, elements overlap, text truncation hides critical content |
| **Handling** | Set `min-width: 320px` on body. Use `overflow-wrap: break-word` on text containers. Test at 320px during development. |
| **Files Affected** | `src/app/globals.css`, `src/components/layout/AppShell.tsx` |

---

## 3. Zod Schemas & TypeScript Types

### EC-3.1: Resume with Missing Optional Sections
| Field | Detail |
|-------|--------|
| **Trigger** | A resume has no `projects`, no `certifications`, or no `summary` |
| **Symptom** | Schema validation fails if optional fields are not properly marked |
| **Handling** | Ensure `projects`, `certifications`, and `summary` use `.optional()` in the Zod schema. Mock data should include a variant with all optional fields absent to verify. |
| **Files Affected** | `src/lib/schemas/resume.ts` |

### EC-3.2: Empty Arrays vs Undefined
| Field | Detail |
|-------|--------|
| **Trigger** | LLM returns `"skills": []` vs omitting the `skills` key entirely |
| **Symptom** | Zod treats `undefined` and `[]` differently. Components that call `.map()` on skills crash on `undefined`. |
| **Handling** | Use `.default([])` on all array fields so undefined is coerced to an empty array. Never rely on `undefined` checks in rendering code. |
| **Files Affected** | All schema files in `src/lib/schemas/` |

### EC-3.3: Unicode and Special Characters in Schema Fields
| Field | Detail |
|-------|--------|
| **Trigger** | Resume contains names like "José García-López", company names with "&" or "™", or skills with "/" (e.g., "CI/CD") |
| **Symptom** | String validation or JSON parsing strips or corrupts special characters |
| **Handling** | Use `.string()` without restrictive regex patterns. Ensure JSON serialization/deserialization preserves UTF-8 throughout. Test with accented characters, CJK characters, and symbols. |
| **Files Affected** | `src/lib/schemas/resume.ts`, `src/lib/schemas/job-description.ts` |

### EC-3.4: Extremely Long Strings
| Field | Detail |
|-------|--------|
| **Trigger** | A resume summary is 2000+ characters, or a single bullet point is 500+ characters |
| **Symptom** | UI overflow, PDF text truncation, or LLM context window exhaustion in Phase 2 |
| **Handling** | Add `.max()` constraints to string fields where appropriate (e.g., `summary: z.string().max(3000).optional()`). Warn in the UI if content exceeds recommended lengths. Don't silently truncate — show a warning. |
| **Files Affected** | `src/lib/schemas/resume.ts` |

### EC-3.5: Invalid Date Formats in Resume
| Field | Detail |
|-------|--------|
| **Trigger** | `startDate` / `endDate` arrives as `"Jan 2020"`, `"2020-01"`, `"01/2020"`, `"January 2020"`, or `"Present"` |
| **Symptom** | Strict date validation rejects valid human-readable dates |
| **Handling** | Use `z.string()` (not `z.date()`) for date fields. Accept free-form date strings. The LLM parser should normalize these, but the schema should be tolerant. Document expected formats but don't enforce a single pattern. |
| **Files Affected** | `src/lib/schemas/resume.ts` |

### EC-3.6: Seniority Level Not in Enum
| Field | Detail |
|-------|--------|
| **Trigger** | LLM returns `"seniorityLevel": "principal"` or `"staff"` which is not in the enum `["entry", "mid", "senior", "lead", "executive", "unknown"]` |
| **Symptom** | Zod validation rejects the entire JD parse |
| **Handling** | Use `.catch("unknown")` or `.transform()` to map unrecognized seniority levels to `"unknown"`. Log the unmapped value for prompt improvement. |
| **Files Affected** | `src/lib/schemas/job-description.ts` |

---

## 4. Resume Input Component

### EC-4.1: PDF with No Extractable Text (Scanned Image PDF)
| Field | Detail |
|-------|--------|
| **Trigger** | User uploads a scanned/image-only PDF with no text layer |
| **Symptom** | `pdf-parse` returns an empty string or whitespace |
| **Handling** | Detect if extracted text length < 50 characters. Show error: "This PDF appears to be a scanned image. Please paste your resume text instead, or upload a text-based PDF." Do NOT silently pass empty text to the LLM. |
| **Files Affected** | `src/lib/parsers/pdf-parser.ts`, `src/components/input/ResumeInput.tsx` |

### EC-4.2: Corrupted or Password-Protected PDF
| Field | Detail |
|-------|--------|
| **Trigger** | User uploads a malformed PDF or one requiring a password |
| **Symptom** | `pdf-parse` throws an exception |
| **Handling** | Wrap `pdf-parse` in try/catch. Display: "Unable to read this PDF. It may be corrupted or password-protected. Please paste your resume text instead." |
| **Files Affected** | `src/lib/parsers/pdf-parser.ts`, `src/components/input/ResumeInput.tsx` |

### EC-4.3: DOCX with Complex Formatting (Tables, Images, Headers/Footers)
| Field | Detail |
|-------|--------|
| **Trigger** | Resume DOCX uses tables for two-column layout, embedded images (logos), or header/footer content |
| **Symptom** | `mammoth` extracts text but loses structural cues — table cells interleave unpredictably |
| **Handling** | Use `mammoth.extractRawText()` rather than HTML conversion for consistency. Warn users: "Complex formatting may not be fully preserved. Please review the extracted text." Show a preview of extracted text so the user can verify. |
| **Files Affected** | `src/lib/parsers/docx-parser.ts`, `src/components/input/ResumeInput.tsx` |

### EC-4.4: File Upload Exceeds 5MB Limit
| Field | Detail |
|-------|--------|
| **Trigger** | User uploads a 10MB PDF with embedded images |
| **Symptom** | Slow upload, potential server-side memory issues, or request timeout |
| **Handling** | Client-side check: `if (file.size > 5 * 1024 * 1024)` → show error before upload. Server-side: set `bodyParser.sizeLimit` in Next.js route config. |
| **Files Affected** | `src/components/input/FileUploader.tsx`, `src/app/api/parse-resume/route.ts` (Phase 2) |

### EC-4.5: Rapid File Re-Uploads (Double-Click)
| Field | Detail |
|-------|--------|
| **Trigger** | User rapidly selects or drops multiple files, or double-clicks the upload button |
| **Symptom** | Multiple concurrent upload requests, race conditions in state updates |
| **Handling** | Debounce file input changes. Disable the upload zone while a file is being processed. Use a loading state to prevent re-upload. |
| **Files Affected** | `src/components/input/FileUploader.tsx` |

### EC-4.6: Unsupported File Type Bypassing Client Validation
| Field | Detail |
|-------|--------|
| **Trigger** | User renames a `.txt` file to `.pdf` or uses browser dev tools to bypass `accept` attribute |
| **Symptom** | `pdf-parse` fails with a non-PDF file |
| **Handling** | Server-side: check file magic bytes (PDF starts with `%PDF-`, DOCX is a ZIP). Don't rely solely on the file extension. |
| **Files Affected** | `src/lib/parsers/pdf-parser.ts`, `src/lib/parsers/docx-parser.ts` |

### EC-4.7: Pasted Resume Contains HTML or Rich Text
| Field | Detail |
|-------|--------|
| **Trigger** | User copies from a formatted document (Google Docs, Word Online) and pastes into the textarea |
| **Symptom** | Pasted text contains HTML tags, `&nbsp;`, or styling artifacts |
| **Handling** | Strip HTML tags from pasted content using a sanitization function. Use `textarea` element (not `contenteditable div`) which naturally strips formatting. Add a paste event handler to sanitize if needed. |
| **Files Affected** | `src/components/input/TextareaWithCounter.tsx` |

### EC-4.8: Empty Resume Input on "Analyze" Click
| Field | Detail |
|-------|--------|
| **Trigger** | User clicks "Analyze" without entering any resume text or uploading a file |
| **Symptom** | Empty string sent to the pipeline |
| **Handling** | Disable the "Analyze" button until both resume and JD inputs have content (minimum 100 characters each). Show inline validation messages on empty fields. |
| **Files Affected** | `src/components/input/ResumeInput.tsx`, `src/app/input/page.tsx` |

### EC-4.9: Very Short Resume (< 200 characters)
| Field | Detail |
|-------|--------|
| **Trigger** | User pastes only their name, email, and a single skill |
| **Symptom** | LLM produces a mostly empty `ResumeProfile` with hallucinated filler |
| **Handling** | Warn: "Your resume appears very short. For best results, include your full experience, skills, and education." Allow submission but display the warning prominently. |
| **Files Affected** | `src/components/input/ResumeInput.tsx` |

---

## 5. Job Description Input Component

### EC-5.1: JD Contains Only a URL
| Field | Detail |
|-------|--------|
| **Trigger** | User pastes a job listing URL instead of text (e.g., `https://careers.example.com/job/12345`) |
| **Symptom** | URL is sent to the LLM which cannot access external links |
| **Handling** | Detect URL pattern in input. Show message: "Please paste the full job description text, not a URL. Copy the text from the job listing page." URL scraping is a post-MVP feature. |
| **Files Affected** | `src/components/input/JDInput.tsx` |

### EC-5.2: JD Contains Multiple Job Listings
| Field | Detail |
|-------|--------|
| **Trigger** | User pastes text containing 2+ different job descriptions concatenated |
| **Symptom** | LLM extracts a confused mix of requirements from both roles |
| **Handling** | No reliable detection in Phase 1. In Phase 2, the LLM prompt should instruct: "If the text contains multiple job listings, extract only the first one and ignore the rest." |
| **Files Affected** | `src/prompts/jd-extraction.ts` (Phase 2) |

### EC-5.3: JD in Non-English Language
| Field | Detail |
|-------|--------|
| **Trigger** | User pastes a JD in German, Japanese, Hindi, etc. |
| **Symptom** | LLM can parse many languages but matching against an English resume produces poor scores |
| **Handling** | Detect input language heuristically (e.g., character set analysis). Warn: "This job description appears to be in [language]. Results are optimized for English resumes and JDs." |
| **Files Affected** | `src/components/input/JDInput.tsx`, `src/lib/utils/language-detector.ts` |

### EC-5.4: JD with Excessive Legal Boilerplate
| Field | Detail |
|-------|--------|
| **Trigger** | JD is 80% equal opportunity statements, benefits, and company boilerplate |
| **Symptom** | LLM extracts legal text as "responsibilities" or "requirements" |
| **Handling** | In Phase 2, the prompt should explicitly instruct: "Ignore EEO statements, benefits descriptions, and legal disclaimers. Focus only on role requirements, skills, and responsibilities." |
| **Files Affected** | `src/prompts/jd-extraction.ts` (Phase 2) |

---

## 6. Side-by-Side Preview (Static Mock Data)

### EC-6.1: Score Animation Flickers on Re-Render
| Field | Detail |
|-------|--------|
| **Trigger** | Component re-renders due to parent state changes, causing the score animation to restart from 0 |
| **Symptom** | Score counter keeps resetting and replaying |
| **Handling** | Gate the animation with a `useRef` flag or `key` prop tied to the score value. Only animate on initial mount or when the score value actually changes. |
| **Files Affected** | `src/components/analysis/ScoreCard.tsx` |

### EC-6.2: Bullet Comparison with Identical Original and Tailored Text
| Field | Detail |
|-------|--------|
| **Trigger** | A bullet that needed no changes (tailored === original) |
| **Symptom** | UI shows two identical columns with no visual indication that it was reviewed and kept |
| **Handling** | Display a "No changes needed" badge or a subtle checkmark. Don't render a diff. Show `changeReason: "Already well-aligned with JD requirements."` |
| **Files Affected** | `src/components/review/BulletComparison.tsx` |

### EC-6.3: Very Long Bullet Text Overflows Container
| Field | Detail |
|-------|--------|
| **Trigger** | A single bullet is 300+ characters with no natural line breaks |
| **Symptom** | Text overflows the comparison column, breaking the side-by-side layout |
| **Handling** | Use `overflow-wrap: break-word` and `word-break: break-word`. Set a `max-height` with `overflow-y: auto` for individual bullets. Don't use `text-overflow: ellipsis` — the user needs to see the full text. |
| **Files Affected** | `src/components/review/BulletComparison.tsx`, `src/components/review/SideBySideDiff.tsx` |

### EC-6.4: Mismatched Bullet Count (Original vs Tailored)
| Field | Detail |
|-------|--------|
| **Trigger** | The tailored resume has fewer or more bullets than the original for a given experience entry |
| **Symptom** | Layout misalignment — rows don't correspond 1:1 |
| **Handling** | Enforce 1:1 mapping in the schema (every original bullet must have a tailored counterpart). If the LLM omits a bullet, fill with `tailored: original, changeReason: "No change"`. If it adds bullets, strip them and flag as fabrication. |
| **Files Affected** | `src/components/review/SideBySideDiff.tsx`, `src/lib/schemas/tailored-resume.ts` |

### EC-6.5: Gap Analysis Panel with Zero Gaps
| Field | Detail |
|-------|--------|
| **Trigger** | Resume is a perfect match — no gaps identified |
| **Symptom** | Empty gap panel looks like a rendering bug |
| **Handling** | Display a success state: "🎉 No significant gaps detected! Your resume covers all key JD requirements." with a green checkmark. |
| **Files Affected** | `src/components/analysis/GapAnalysisPanel.tsx` |

### EC-6.6: Gap Analysis Panel with 20+ Gaps
| Field | Detail |
|-------|--------|
| **Trigger** | Massive mismatch between resume and JD (career changer scenario) |
| **Symptom** | Panel becomes overwhelmingly long, user loses focus |
| **Handling** | Cap the initially visible gaps at 10 (sorted by importance). Show "Show X more gaps" expand button. Group by importance level. |
| **Files Affected** | `src/components/analysis/GapAnalysisPanel.tsx` |

### EC-6.7: JD Summary Card with No Skills Extracted
| Field | Detail |
|-------|--------|
| **Trigger** | Very vague JD with no clear technical requirements |
| **Symptom** | Empty tag chips area |
| **Handling** | Display: "No specific skills were extracted from this JD. Consider providing a more detailed job description." |
| **Files Affected** | `src/components/analysis/JDSummaryCard.tsx` |

---

## 7. Page Assembly & Routing

### EC-7.1: Direct URL Access to Review/Export Pages Without Data
| Field | Detail |
|-------|--------|
| **Trigger** | User bookmarks or directly navigates to `/review` or `/export` without completing the pipeline |
| **Symptom** | Page crashes due to missing `TailoringRun` data in the store |
| **Handling** | Check for required state on each page's mount. If missing, redirect to `/input` with a flash message: "Please complete the analysis first." Use a route guard pattern. |
| **Files Affected** | `src/app/review/page.tsx`, `src/app/export/page.tsx`, `src/lib/store/tailoring-store.ts` |

### EC-7.2: Browser Refresh Clears Session State
| Field | Detail |
|-------|--------|
| **Trigger** | User refreshes the browser on the Review or Export page |
| **Symptom** | Zustand/Context state is lost, page shows empty content or crashes |
| **Handling** | Persist `TailoringRun` state in `sessionStorage`. On mount, check `sessionStorage` first. If data exists, rehydrate. If not, redirect to `/input`. Use Zustand's `persist` middleware with `sessionStorage` adapter. |
| **Files Affected** | `src/lib/store/tailoring-store.ts` |

### EC-7.3: Back Navigation After Analysis Creates Stale Data
| Field | Detail |
|-------|--------|
| **Trigger** | User completes analysis, goes to Review, then presses browser Back to Input, modifies the resume, and re-submits |
| **Symptom** | Review page may show stale data from the previous run |
| **Handling** | Clear all downstream state (scores, tailored resume, gaps) when inputs change. Generate a new `runId` for each analysis to prevent stale data. |
| **Files Affected** | `src/lib/store/tailoring-store.ts`, `src/app/input/page.tsx` |

### EC-7.4: Session Storage Exceeds Browser Quota
| Field | Detail |
|-------|--------|
| **Trigger** | Very large `TailoringRun` objects (e.g., 4-page resume with 30 bullets) exceed the ~5MB `sessionStorage` limit |
| **Symptom** | `QuotaExceededError` thrown when persisting state |
| **Handling** | Catch quota errors. If exceeded, skip persistence and show a warning: "Session too large to auto-save. Please don't refresh the page." Consider compressing JSON with `lz-string` if this occurs frequently. |
| **Files Affected** | `src/lib/store/tailoring-store.ts` |

### EC-7.5: Concurrent Browser Tabs
| Field | Detail |
|-------|--------|
| **Trigger** | User opens the app in 2+ tabs and runs analysis in both |
| **Symptom** | `sessionStorage` is shared per origin — tabs overwrite each other's state |
| **Handling** | Include a unique `tabId` (generated via `crypto.randomUUID()`) in the storage key. Each tab maintains its own independent session. |
| **Files Affected** | `src/lib/store/tailoring-store.ts` |

---

## Quick Reference: Edge Case Checklist

Use this checklist during Phase 1 code reviews:

- [ ] Node.js version is validated before project init
- [ ] All CSS custom properties cascade correctly into Shadcn components
- [ ] Glassmorphism has a solid fallback for unsupported browsers
- [ ] `prefers-reduced-motion` is respected for all animations
- [ ] All Zod array fields have `.default([])` to prevent `undefined` iteration
- [ ] All Zod string fields allow UTF-8 (no restrictive regex)
- [ ] Date fields accept free-form strings, not strict ISO dates
- [ ] PDF parser detects and rejects scanned/image-only PDFs
- [ ] File upload validates both client-side (extension, size) and server-side (magic bytes)
- [ ] Textarea strips HTML from rich-text pastes
- [ ] "Analyze" button is disabled when inputs are empty
- [ ] Step indicator derives active step from URL, not stored state
- [ ] Route guard redirects to `/input` when state is missing
- [ ] Session state persists across page refreshes via `sessionStorage`
- [ ] Concurrent tabs don't overwrite each other's state
