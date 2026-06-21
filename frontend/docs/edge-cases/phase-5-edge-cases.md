# Phase 5 Edge Cases — The Launch (Production Polish & QA)

> **Reference:** [Implementation Plan — Phase 5](../implementation-plan.md#phase-5-the-launch--production-polish--qa)
>
> **Scope:** Loading states & error boundaries, one-click demo with sample data, landing page & responsive polish, end-to-end QA & edge case testing.

---

## 1. Loading States & Error Boundaries

### EC-5.1.1: Stage Progress Indicator Shows Wrong Stage
| Field | Detail |
|-------|--------|
| **Trigger** | A fast LLM response completes before the UI updates, or a retry resets the progress |
| **Symptom** | Indicator shows "Scoring…" when the system is actually on "Tailoring" |
| **Handling** | Derive the stage indicator state from the orchestrator's actual async state (e.g., a `currentStage` state variable updated BEFORE each API call starts). Never use timers or estimated durations to simulate progress. |
| **Files Affected** | `src/components/ui/StageProgress.tsx`, `src/lib/api/orchestrator.ts` |

### EC-5.1.2: Skeleton Loaders Don't Match Final Content Layout
| Field | Detail |
|-------|--------|
| **Trigger** | Skeleton card has 3 lines but actual content renders 8 lines |
| **Symptom** | Jarring layout shift when content replaces skeleton — poor Cumulative Layout Shift (CLS) score |
| **Handling** | Design skeletons to match the approximate height and structure of the real content. Use `min-height` on containers to reserve space. Match skeleton grid proportions to the actual component layout. |
| **Files Affected** | `src/components/ui/SkeletonCard.tsx` |

### EC-5.1.3: Error Boundary Catches But Doesn't Recover
| Field | Detail |
|-------|--------|
| **Trigger** | A rendering error is caught by the error boundary, user clicks "Retry", but the same error occurs |
| **Symptom** | Infinite error → retry → error loop |
| **Handling** | Track retry count. After 3 retries, change the message to: "This error persists. Please refresh the page or try with different input." On retry, reset the component state completely using a `key` prop change. |
| **Files Affected** | `src/components/ui/ErrorBoundary.tsx` |

### EC-5.1.4: Next.js `error.tsx` Not Catching Client-Side Errors
| Field | Detail |
|-------|--------|
| **Trigger** | Client-side JavaScript error occurs outside of a React component tree (e.g., in a `useEffect` callback or event handler) |
| **Symptom** | White screen with no error UI |
| **Handling** | Add a global `window.onerror` and `window.onunhandledrejection` handler in `layout.tsx`. Display a fallback error UI with a page refresh button. Log errors to the console for debugging. |
| **Files Affected** | `src/app/layout.tsx`, `src/app/error.tsx` |

### EC-5.1.5: Loading Overlay Blocks User Interaction Permanently
| Field | Detail |
|-------|--------|
| **Trigger** | Pipeline crashes or hangs, but the loading overlay never dismisses |
| **Symptom** | User is trapped behind a non-dismissible overlay |
| **Handling** | Add a "Cancel" button to the loading overlay that appears after 10 seconds. Add a total timeout of 3 minutes. If timeout fires, dismiss overlay and show error: "The analysis timed out. Please try again." |
| **Files Affected** | `src/components/ui/LoadingOverlay.tsx` |

### EC-5.1.6: Multiple Rapid Retry Clicks
| Field | Detail |
|-------|--------|
| **Trigger** | User clicks "Retry" button 5 times in rapid succession |
| **Symptom** | Multiple concurrent pipeline executions |
| **Handling** | Disable the retry button immediately on click. Show a loading state. Debounce with at least 1 second cooldown between retries. |
| **Files Affected** | `src/components/ui/ErrorCard.tsx` |

### EC-5.1.7: Network Reconnection After Offline Period
| Field | Detail |
|-------|--------|
| **Trigger** | User loses internet during pipeline execution, then reconnects |
| **Symptom** | In-flight requests have failed, but the UI doesn't know the network is back |
| **Handling** | Listen for `window.addEventListener('online', ...)`. When connection restores, show a toast: "Connection restored. You can retry your analysis." Don't auto-retry — let the user decide. |
| **Files Affected** | `src/components/ui/ErrorBoundary.tsx`, `src/app/layout.tsx` |

---

## 2. One-Click Demo

### EC-5.2.1: Demo Data Produces Inconsistent Results Due to LLM Non-Determinism
| Field | Detail |
|-------|--------|
| **Trigger** | Same demo data produces very different scores on different runs (e.g., 65 vs 82) |
| **Symptom** | User runs the demo twice and sees wildly different outcomes — erodes trust |
| **Handling** | Set `temperature: 0.1` for demo mode (lower than normal). Consider caching demo results for the first 24 hours. Accept ±5 point variance as normal. |
| **Files Affected** | `src/lib/demo/sample-resume.ts`, `src/lib/api/orchestrator.ts` |

### EC-5.2.2: Demo Fails Because API Key is Not Configured
| Field | Detail |
|-------|--------|
| **Trigger** | New user clones the repo, clicks "Try Demo", but hasn't set up `.env.local` |
| **Symptom** | Demo crashes with an LLM authentication error |
| **Handling** | Before running the demo, check if the API key is configured. If not, show: "To run the demo, please add your API key in `.env.local`. See the setup guide for details." Optionally, show a pre-computed static demo result (from `sample-tailoring-run.ts`) as a fallback when no API key is available. |
| **Files Affected** | `src/lib/store/tailoring-store.ts`, `src/app/page.tsx` |

### EC-5.2.3: Demo Sample Data Becomes Outdated
| Field | Detail |
|-------|--------|
| **Trigger** | Sample JD references technologies or frameworks that become obsolete over time |
| **Symptom** | Demo feels dated — mentions "React 17" instead of the current version |
| **Handling** | Use technology-agnostic language where possible. Focus on concepts ("frontend framework", "state management") rather than specific version numbers. Review sample data quarterly. |
| **Files Affected** | `src/lib/demo/sample-resume.ts`, `src/lib/demo/sample-jd.ts` |

### EC-5.2.4: Demo Mode Overwrites User's In-Progress Work
| Field | Detail |
|-------|--------|
| **Trigger** | User has partially filled in their resume, then clicks "Try Demo" from the landing page |
| **Symptom** | User's input is replaced by demo data without confirmation |
| **Handling** | Before loading demo data, check if the store has existing user input. If so, show a confirmation: "Loading the demo will replace your current inputs. Continue?" with "Cancel" and "Load Demo" buttons. |
| **Files Affected** | `src/app/page.tsx`, `src/lib/store/tailoring-store.ts` |

### EC-5.2.5: Demo Score Improvement is Underwhelming (< 10 Points)
| Field | Detail |
|-------|--------|
| **Trigger** | The sample resume already matches the sample JD well |
| **Symptom** | Demo goes from 72 → 78, which doesn't impress new users |
| **Handling** | Craft the sample resume to have obvious mismatches: use different terminology for the same concepts, list technologies generically, use weak action verbs. The JD should use specific, strong language. Target a 20-30 point improvement. |
| **Files Affected** | `src/lib/demo/sample-resume.ts`, `src/lib/demo/sample-jd.ts` |

---

## 3. Landing Page & Responsive Polish

### EC-5.3.1: Hero Gradient Animation Causes High CPU/GPU Usage
| Field | Detail |
|-------|--------|
| **Trigger** | CSS animated gradient background runs continuously |
| **Symptom** | Fan spins up, battery drains, page performance drops |
| **Handling** | Use a subtle, slow animation (> 10s cycle). Apply `will-change: background-position` for GPU acceleration. Stop the animation when the hero section scrolls out of viewport using `IntersectionObserver`. Respect `prefers-reduced-motion`. |
| **Files Affected** | `src/app/page.tsx`, `src/app/globals.css` |

### EC-5.3.2: Scroll-Triggered Animations Fire on Page Load (No Scroll Yet)
| Field | Detail |
|-------|--------|
| **Trigger** | On short viewports, elements below the fold are already visible on load |
| **Symptom** | Animations play immediately without the "entrance" effect |
| **Handling** | Use `IntersectionObserver` with `threshold: 0.2` — only trigger when 20% of the element is visible. Elements already in viewport on load should animate immediately (don't wait for scroll). Use `once: true` to prevent re-triggering. |
| **Files Affected** | `src/app/page.tsx` |

### EC-5.3.3: Mobile Touch Targets Too Small
| Field | Detail |
|-------|--------|
| **Trigger** | Buttons, links, and interactive elements are < 44x44px on mobile |
| **Symptom** | Users tap the wrong element or can't tap accurately |
| **Handling** | Enforce minimum touch target size of 44x44px (Apple HIG) / 48x48px (Material Design). Add padding to small clickable elements. Use `min-height: 44px` on all buttons. |
| **Files Affected** | All components in `src/components/` |

### EC-5.3.4: Side-by-Side Comparison Unreadable on Mobile
| Field | Detail |
|-------|--------|
| **Trigger** | Two-column layout on a 375px viewport |
| **Symptom** | Each column is ~180px wide — text is microscopic or heavily wrapped |
| **Handling** | Below 768px, switch to a stacked/tabbed layout: Tab 1 = "Original", Tab 2 = "Tailored". Or show them vertically stacked with clear visual separation. Never render two side-by-side columns below 768px. |
| **Files Affected** | `src/components/review/SideBySideDiff.tsx` |

### EC-5.3.5: Footer Links Not Visible (Covered by Fixed Elements)
| Field | Detail |
|-------|--------|
| **Trigger** | A fixed bottom navigation or floating action button covers the footer on mobile |
| **Symptom** | User can't access footer links (GitHub, disclaimer, etc.) |
| **Handling** | Add `padding-bottom` to the main content area equal to the height of any fixed bottom elements. Ensure the footer is always scrollable into full view. |
| **Files Affected** | `src/components/layout/AppShell.tsx` |

### EC-5.3.6: Lighthouse Performance Score Below 80
| Field | Detail |
|-------|--------|
| **Trigger** | Heavy JavaScript bundle, unoptimized images, render-blocking CSS |
| **Symptom** | Slow First Contentful Paint (FCP), poor Time to Interactive (TTI) |
| **Handling** | Lazy-load non-critical components (side-by-side viewer, PDF preview). Use `next/dynamic` for heavy components. Optimize fonts with `font-display: swap`. Defer non-essential JavaScript. Use `next/image` for any images. Run Lighthouse CI in the build pipeline. |
| **Files Affected** | `src/app/layout.tsx`, all page components |

### EC-5.3.7: Meta Tags and SEO Incomplete
| Field | Detail |
|-------|--------|
| **Trigger** | Missing or generic `<title>`, `<meta description>`, Open Graph tags |
| **Symptom** | Poor search engine indexing, ugly social media link previews |
| **Handling** | Set page-specific `metadata` exports in each page's `layout.tsx` or `page.tsx`. Include: `title`, `description`, `og:title`, `og:description`, `og:image`. Use Next.js `Metadata` API. |
| **Files Affected** | `src/app/layout.tsx`, all `page.tsx` files |

---

## 4. End-to-End QA & Edge Case Testing

### EC-5.4.1: Resume and JD in Mismatched Industries
| Field | Detail |
|-------|--------|
| **Trigger** | Chef's resume + Software Engineer JD, or Teacher's resume + Finance JD |
| **Symptom** | Very low score (< 15), possibly zero tailoring changes, many gaps |
| **Expected Handling** | Score should be honest (very low). Tailoring should make minimal changes (no fabrication). Gap list should be long and all marked `canSafelyAdd: false`. UI should display a message: "Your resume has very little overlap with this job description." |
| **Test Action** | Verify the pipeline completes without crashing. Verify no fabricated technologies appear. Verify the PDF generates correctly even with low scores. |

### EC-5.4.2: Same Text in Both Resume and JD Fields
| Field | Detail |
|-------|--------|
| **Trigger** | User pastes the same text (a resume) into both fields |
| **Symptom** | JD parser extracts experience bullets as "requirements", scoring is nonsensical |
| **Expected Handling** | The JD parser should return sparse/invalid results. The UI should warn: "This text looks like a resume, not a job description. Please paste the job listing text." |
| **Test Action** | Verify heuristic detection catches this case (Phase 2, EC-2.4.2). Verify no crash. |

### EC-5.4.3: Very Short JD (Single Sentence)
| Field | Detail |
|-------|--------|
| **Trigger** | JD: "Senior React Developer needed. Apply now." |
| **Symptom** | Minimal extraction, unreliable scoring |
| **Expected Handling** | Warning banner about sparse JD. Partial results. Score should have a wide confidence band. Gap analysis should note the JD lacks specificity. |
| **Test Action** | Verify warning is displayed. Verify pipeline doesn't crash. Verify PDF generates with whatever data is available. |

### EC-5.4.4: Resume with Only Education (No Experience)
| Field | Detail |
|-------|--------|
| **Trigger** | Fresh graduate resume: education, skills, projects, but zero work experience |
| **Symptom** | `experience: []` — the tailoring engine has no bullets to rewrite |
| **Expected Handling** | Tailoring should focus on projects and skills reordering. Score should reflect the lack of experience honestly. Gap analysis should note the experience gap without suggesting fabrication. |
| **Test Action** | Verify `tailoredExperience` is empty array, not `undefined`. Verify project bullets are tailored. Verify PDF renders without the Experience section (or with an empty section handled gracefully). |

### EC-5.4.5: XSS/Injection via Resume or JD Text
| Field | Detail |
|-------|--------|
| **Trigger** | Resume contains `<script>alert('xss')</script>` or `<img src=x onerror=alert('xss')>` |
| **Symptom** | Script executes in the browser, especially in the side-by-side preview or PDF preview |
| **Expected Handling** | All user-provided text must be rendered with proper escaping. React's JSX automatically escapes strings rendered via `{}`. Never use `dangerouslySetInnerHTML` with user content. Sanitize before PDF generation. |
| **Test Action** | Paste XSS payload into both fields. Verify no script execution. Verify text is rendered as literal characters. Verify PDF contains escaped text. |

### EC-5.4.6: Non-English Resume (Spanish, Hindi, Mandarin)
| Field | Detail |
|-------|--------|
| **Trigger** | Resume is entirely in a non-English language |
| **Symptom** | LLM can parse many languages but results are unpredictable. Matching against a JD in a different language is inherently flawed. |
| **Expected Handling** | Detect non-English input. Warn: "This appears to be in [language]. Results are optimized for English. Accuracy may vary." Allow the pipeline to proceed — the LLM may still extract useful structure. |
| **Test Action** | Verify warning is shown. Verify the pipeline completes. Verify the PDF renders non-ASCII characters correctly. |

### EC-5.4.7: Browser Zoom at 200%+
| Field | Detail |
|-------|--------|
| **Trigger** | User has browser zoom set to 200% or higher (common for accessibility) |
| **Symptom** | Layout breaks — elements overflow, overlap, or become inaccessible |
| **Expected Handling** | All layouts should be responsive and handle zoom up to 200%. Use relative units (`rem`, `em`, `%`) instead of fixed `px` for text and spacing. Test at 200% zoom. |
| **Test Action** | Set browser zoom to 200%. Navigate all pages. Verify no horizontal scroll, no overlapping elements, and all text remains readable. |

### EC-5.4.8: Keyboard-Only Navigation (No Mouse)
| Field | Detail |
|-------|--------|
| **Trigger** | User relies entirely on keyboard (Tab, Enter, Space, Arrow keys) |
| **Symptom** | Focus indicators missing, interactive elements unreachable, or focus order is illogical |
| **Expected Handling** | Every interactive element must be focusable and have a visible focus indicator. Tab order should follow visual order. Modals must trap focus. Custom components must have proper `role`, `tabIndex`, and keyboard event handlers. |
| **Test Action** | Navigate the entire app using only keyboard. Verify all buttons, links, inputs, and modals are reachable. Verify focus indicators are visible. |

### EC-5.4.9: Production Build Has Console Errors or Warnings
| Field | Detail |
|-------|--------|
| **Trigger** | Development-only code, missing keys in lists, or deprecated API usage |
| **Symptom** | Console filled with warnings or errors in production build |
| **Expected Handling** | Zero console errors in production. Fix all React key warnings, hydration mismatches, and deprecated API calls. Use `React.StrictMode` during development to surface issues early. |
| **Test Action** | Run `npm run build && npm start`. Open browser console. Verify zero errors and zero warnings on every page. |

### EC-5.4.10: State Corruption After Multiple Analysis Runs
| Field | Detail |
|-------|--------|
| **Trigger** | User runs the pipeline 5+ times without refreshing, with different resume/JD combinations each time |
| **Symptom** | Stale data from a previous run bleeds into the current run (e.g., old gap analysis showing with new scores) |
| **Expected Handling** | Each new analysis run should completely clear the previous `TailoringRun` data before starting. Generate a new `runId` for each run. Clear all downstream state (tailored resume, scores, gaps) atomically. |
| **Test Action** | Run the pipeline 3 times with different inputs. Verify each run shows only its own data. Verify no cross-contamination between runs. |

### EC-5.4.11: PDF Opens Correctly in Multiple Readers
| Field | Detail |
|-------|--------|
| **Trigger** | User opens PDF in Chrome built-in viewer, Firefox built-in viewer, Adobe Acrobat, macOS Preview, or mobile PDF viewers |
| **Symptom** | Fonts missing, layout broken, or landscape orientation not respected in certain viewers |
| **Expected Handling** | Embed fonts as subsets in the PDF. Use standard PDF features (no JavaScript in PDF, no form fields, no annotations). Test in at least 3 different PDF readers. |
| **Test Action** | Generate both PDFs. Open in Chrome, Firefox, and at least one desktop PDF reader. Verify fonts, layout, and orientation. |

---

## 5. Cross-Phase Integration Edge Cases

These edge cases span multiple phases and are best caught during end-to-end testing:

### EC-5.5.1: Guardrail Results Disappear After PDF Export
| Field | Detail |
|-------|--------|
| **Trigger** | After successful PDF export, user navigates back to Review |
| **Symptom** | Guardrail confirmations are lost — user must re-confirm |
| **Handling** | Persist guardrail confirmation state in the same store as `TailoringRun`. Export should not clear any state. |
| **Files Affected** | `src/lib/store/tailoring-store.ts` |

### EC-5.5.2: Full Pipeline Succeeds but PDF Has Stale Data
| Field | Detail |
|-------|--------|
| **Trigger** | User modifies resume text on the input page, re-runs analysis, but the PDF still shows old data |
| **Symptom** | PDF content doesn't match the review screen |
| **Handling** | PDF generation should always read from the current `TailoringRun` in the store, not from a cached version. Validate the `runId` matches. |
| **Files Affected** | `src/app/api/generate-pdf/route.ts` |

### EC-5.5.3: User Shares PDF URL (Direct Link to Export Page)
| Field | Detail |
|-------|--------|
| **Trigger** | User copies the URL `example.com/export` and shares it |
| **Symptom** | Recipient visits the URL but has no session data — blank page |
| **Handling** | Export page should check for session data. If absent, show: "No analysis data found. Please start a new analysis." with a link to the input page. Consider generating shareable links as a post-MVP feature. |
| **Files Affected** | `src/app/export/page.tsx` |

---

## Quick Reference: Edge Case Checklist

Use this checklist during Phase 5 code reviews:

- [ ] Stage progress derives from actual orchestrator state, not timers
- [ ] Skeleton loaders match the approximate height of final content
- [ ] Error boundary has a retry limit (3x) with a "refresh page" fallback
- [ ] Global error handler catches uncaught exceptions outside React tree
- [ ] Loading overlay has a cancel button (appears after 10s) and total timeout (3min)
- [ ] Demo mode checks for API key availability before executing
- [ ] Demo data warns before overwriting user's existing input
- [ ] Hero animation respects `prefers-reduced-motion` and stops when off-screen
- [ ] Minimum touch target size is 44x44px on mobile
- [ ] Side-by-side layout switches to stacked/tabbed below 768px
- [ ] All pages pass Lighthouse performance ≥ 80
- [ ] SEO metadata is set on every page (title, description, OG tags)
- [ ] XSS payloads in input fields are rendered as escaped text, never executed
- [ ] Browser zoom at 200% produces no layout breakage
- [ ] All interactions are reachable via keyboard alone
- [ ] Production build has zero console errors and zero warnings
- [ ] Multiple sequential analysis runs don't cause state cross-contamination
- [ ] PDFs render correctly in Chrome, Firefox, and at least one desktop reader
