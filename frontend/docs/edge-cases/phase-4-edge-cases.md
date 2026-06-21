# Phase 4 Edge Cases — The Proof (PDF Export Engine)

> **Reference:** [Implementation Plan — Phase 4](../implementation-plan.md#phase-4-the-proof--pdf-export-engine)
>
> **Scope:** Tailored resume PDF template, side-by-side proof PDF template, diff highlighting engine, export & download flow.

---

## 1. Tailored Resume PDF Template

### EC-4.1.1: Content Exceeds Single Page — Awkward Page Breaks
| Field | Detail |
|-------|--------|
| **Trigger** | A long resume with 4+ experience entries causes a page break mid-company (header on page 1, bullets on page 2) |
| **Symptom** | Orphaned company header at the bottom of a page with no bullets, or a widow bullet at the top of the next page |
| **Handling** | Use CSS `break-inside: avoid` on each experience block. If a block is too tall for the remaining page space, move the entire block to the next page. Set `orphans: 2; widows: 2` to prevent single-line orphans/widows. |
| **Files Affected** | `src/lib/pdf/tailored-resume-template.tsx`, `src/lib/pdf/styles.ts` |

### EC-4.1.2: Contact Information Wrapping or Truncation
| Field | Detail |
|-------|--------|
| **Trigger** | Candidate has a very long name, long email, multiple portfolio links, or a full street address |
| **Symptom** | Contact header wraps to 3-4 lines, pushing content down and wasting space |
| **Handling** | Limit contact display to: Name (full width), then a single inline row of `email · phone · city, state · primary link`. Truncate URLs to domain only (`github.com/user` not `https://github.com/user/repositories`). If more than 3 links, show "& X more" or use icons. |
| **Files Affected** | `src/lib/pdf/tailored-resume-template.tsx` |

### EC-4.1.3: Special Characters Breaking PDF Rendering
| Field | Detail |
|-------|--------|
| **Trigger** | Resume contains emoji (📊), mathematical symbols (≥, ±), accented characters (résumé), or CJK characters |
| **Symptom** | Characters render as boxes (□), question marks (?), or are missing entirely |
| **Handling** | Register a font that supports the full Unicode range (e.g., Noto Sans for broad coverage). Test with accented Latin, CJK, and common emoji. If using `@react-pdf/renderer`, ensure the registered font supports the character set. Fallback: strip unsupported characters and warn. |
| **Files Affected** | `src/lib/pdf/fonts.ts`, `src/lib/pdf/tailored-resume-template.tsx` |

### EC-4.1.4: Empty Optional Sections Creating Blank Space
| Field | Detail |
|-------|--------|
| **Trigger** | Resume has no projects, no certifications, and no summary |
| **Symptom** | PDF renders "PROJECTS" header with nothing below it, or large blank areas |
| **Handling** | Conditionally render sections: only show a section header if the section has content. `{projects.length > 0 && <ProjectsSection />}`. Never render empty section headers. |
| **Files Affected** | `src/lib/pdf/tailored-resume-template.tsx` |

### EC-4.1.5: Very Long Bullet Point Overflowing
| Field | Detail |
|-------|--------|
| **Trigger** | A single bullet is 400+ characters — wraps to 5+ lines in the PDF |
| **Symptom** | One bullet consumes disproportionate space, making the resume look unbalanced |
| **Handling** | Display as-is (don't truncate — it's the user's content). But add a non-blocking warning in the UI during review: "Some bullets are very long. Consider shortening them for readability." Keep the PDF rendering faithful to the content. |
| **Files Affected** | `src/lib/pdf/tailored-resume-template.tsx` |

### EC-4.1.6: PDF File Size Too Large (> 500KB)
| Field | Detail |
|-------|--------|
| **Trigger** | Embedded fonts, complex styling, or long content bloats the PDF |
| **Symptom** | Slow download, email attachment limits exceeded |
| **Handling** | Use font subsetting (embed only used glyphs, not the full font file). Minimize CSS complexity. Compress the PDF stream. If using Playwright, pass `--no-pdf-tagging` for smaller output. Target < 200KB for a typical 2-page resume. |
| **Files Affected** | `src/lib/pdf/fonts.ts`, `src/app/api/generate-pdf/route.ts` |

### EC-4.1.7: ATS Scanner Cannot Parse the PDF
| Field | Detail |
|-------|--------|
| **Trigger** | PDF uses overly complex layout, SVG elements, or lacks text layer |
| **Symptom** | ATS systems extract garbled text or can't parse sections |
| **Handling** | Use simple, linear HTML-to-PDF rendering. Avoid: absolute positioning, floating elements, multi-column CSS, SVG icons inline. Use semantic HTML headings (`<h2>`, `<h3>`) for section headers. Test by selecting all text in the PDF — it should read in logical order. |
| **Files Affected** | `src/lib/pdf/tailored-resume-template.tsx` |

---

## 2. Side-by-Side Proof PDF Template

### EC-4.2.1: Columns Misaligned When Bullet Lengths Differ
| Field | Detail |
|-------|--------|
| **Trigger** | Original bullet is 1 line but tailored bullet is 5 lines (or vice versa) |
| **Symptom** | The next row starts at different heights in each column — columns drift apart |
| **Handling** | Render each bullet pair as a single row with two equal-height cells. Use a table or CSS grid with `align-items: stretch`. Both cells in a row must have the same height, determined by the taller cell. |
| **Files Affected** | `src/lib/pdf/proof-report-template.tsx` |

### EC-4.2.2: Proof PDF Exceeds 10 Pages for Long Resumes
| Field | Detail |
|-------|--------|
| **Trigger** | A 4-page resume with 30+ bullets, each with metadata (change reason, confidence, risk flag), plus gap analysis |
| **Symptom** | PDF becomes 15+ pages — unwieldy for review |
| **Handling** | Summarize unchanged bullets: "X bullets unchanged — no modifications needed." Only show full detail for bullets that changed. Collapse metadata by default — show one-line summary with full detail available in an appendix section. |
| **Files Affected** | `src/lib/pdf/proof-report-template.tsx` |

### EC-4.2.3: Score Comparison Arrow Direction
| Field | Detail |
|-------|--------|
| **Trigger** | Tailored score is lower than original (rare but possible) |
| **Symptom** | Arrow pointing "up" with a lower number is misleading |
| **Handling** | Use directional indicators: ↑ green arrow if score improved, ↓ red arrow if decreased, → neutral if unchanged. Color the tailored score red if it decreased. Add a note: "Score decreased — this may indicate AI scoring variance." |
| **Files Affected** | `src/lib/pdf/proof-report-template.tsx` |

### EC-4.2.4: Landscape PDF Printing Issues
| Field | Detail |
|-------|--------|
| **Trigger** | User prints the proof PDF — printer defaults to portrait orientation |
| **Symptom** | Content is cropped or scaled down to 50% to fit portrait |
| **Handling** | Set PDF metadata to prefer landscape orientation. Add a header note: "Best viewed and printed in landscape orientation." Use CSS `@page { size: landscape; }` for the proof template. |
| **Files Affected** | `src/lib/pdf/proof-report-template.tsx` |

### EC-4.2.5: Disclaimer Footer Missing on Multi-Page Reports
| Field | Detail |
|-------|--------|
| **Trigger** | Proof report spans 3+ pages |
| **Symptom** | Disclaimer only appears on the last page, not on every page |
| **Handling** | Use a fixed footer on every page: "Disclaimer: Verify all content before use." If using `@react-pdf/renderer`, use `fixed` prop on footer element. If using Playwright, use `displayHeaderFooter: true` with custom footer template. |
| **Files Affected** | `src/lib/pdf/proof-report-template.tsx` |

### EC-4.2.6: Gap Analysis Section Empty in Proof PDF
| Field | Detail |
|-------|--------|
| **Trigger** | No gaps identified (perfect match scenario) |
| **Symptom** | "GAP ANALYSIS" header with nothing below it in the PDF |
| **Handling** | Replace with: "No significant gaps detected. Your resume covers all key JD requirements. ✅" Never show an empty section. |
| **Files Affected** | `src/lib/pdf/proof-report-template.tsx` |

### EC-4.2.7: Risk Flags in PDF When Guardrails Not Confirmed
| Field | Detail |
|-------|--------|
| **Trigger** | User overrides the confirmation modal and exports with unconfirmed flags |
| **Symptom** | PDF contains content the user hasn't verified |
| **Handling** | If any high-risk flags are unconfirmed, add a prominent watermark or banner on the first page: "⚠️ DRAFT — Contains unverified content." Mark each unconfirmed bullet with a visible "UNVERIFIED" tag in the PDF. |
| **Files Affected** | `src/lib/pdf/proof-report-template.tsx`, `src/app/api/generate-pdf/route.ts` |

---

## 3. Diff Highlighting Engine

### EC-4.3.1: Entirely Rewritten Bullet (100% Different)
| Field | Detail |
|-------|--------|
| **Trigger** | Original: "Helped with testing." → Tailored: "Developed and executed comprehensive integration test suites for mission-critical payment processing systems." |
| **Symptom** | Every word is marked as removed/added — the diff is a sea of red and green, unreadable |
| **Handling** | If diff ratio > 80% changed, switch from word-level diff to showing both bullets as complete blocks: left = original (greyed out), right = tailored (full color), with a note: "Significantly rewritten." Don't show per-word highlights for near-total rewrites. |
| **Files Affected** | `src/lib/pdf/diff-engine.ts`, `src/lib/pdf/DiffHighlightedText.tsx` |

### EC-4.3.2: Identical Bullets (0% Different)
| Field | Detail |
|-------|--------|
| **Trigger** | Bullet was not changed during tailoring |
| **Symptom** | Diff engine returns all-unchanged segments — visually boring but correct |
| **Handling** | Show the bullet in a muted/dimmed style with a "No changes" label. Don't apply diff highlighting. Skip unchanged bullets in the proof PDF summary section to reduce noise. |
| **Files Affected** | `src/lib/pdf/diff-engine.ts`, `src/lib/pdf/DiffHighlightedText.tsx` |

### EC-4.3.3: Punctuation-Only Differences
| Field | Detail |
|-------|--------|
| **Trigger** | Original: "Built APIs for data processing" → Tailored: "Built APIs for data processing." (added period) |
| **Symptom** | Diff highlights only a trailing period — feels insignificant |
| **Handling** | Normalize trailing punctuation before diffing (strip trailing `.`, `,`, `;`). Only report meaningful word-level changes. If the only difference is punctuation, mark as "Minor formatting change" or "No significant changes." |
| **Files Affected** | `src/lib/pdf/diff-engine.ts` |

### EC-4.3.4: Word-Split Boundary Issues
| Field | Detail |
|-------|--------|
| **Trigger** | Original: "CI/CD pipelines". Tailored: "CI / CD pipelines" (spaces around slash) |
| **Symptom** | "CI/CD" splits into `["CI/CD"]` vs `["CI", "/", "CD"]` — false diff |
| **Handling** | Normalize whitespace and separator handling before diffing. Split on word boundaries but treat `word/word` as a single token. Normalize multiple spaces to single space. |
| **Files Affected** | `src/lib/pdf/diff-engine.ts` |

### EC-4.3.5: Diff Performance on Extremely Long Bullets
| Field | Detail |
|-------|--------|
| **Trigger** | A 500-character bullet with many changes |
| **Symptom** | Diff algorithm takes > 100ms, causing UI jank or PDF generation delay |
| **Handling** | Use the `diff` library's optimized word-diff algorithm. For bullets > 300 words, fall back to sentence-level diffing rather than word-level. The 10ms target should hold for typical bullets (< 200 words). |
| **Files Affected** | `src/lib/pdf/diff-engine.ts` |

### EC-4.3.6: Diff Highlighting Colors in Print Mode
| Field | Detail |
|-------|--------|
| **Trigger** | User prints the PDF on a black-and-white printer |
| **Symptom** | Red and green highlights look identical in grayscale |
| **Handling** | Use different visual treatments beyond color: removed text gets strikethrough + lighter gray, added text gets bold + darker black. Use patterns, not just colors. Test by printing in grayscale. |
| **Files Affected** | `src/lib/pdf/DiffHighlightedText.tsx`, `src/lib/pdf/styles.ts` |

---

## 4. Export & Download Flow

### EC-4.4.1: PDF Generation Times Out on Server
| Field | Detail |
|-------|--------|
| **Trigger** | Playwright/Puppeteer takes > 30 seconds to render a complex proof PDF |
| **Symptom** | Vercel or Next.js API route times out (default 10-60s depending on plan) |
| **Handling** | Optimize rendering: pre-compute diff segments, minimize DOM complexity. Set route timeout to 60s. If still timing out, use streaming: send a "generating" response immediately, then use a polling mechanism or websocket to deliver the PDF when ready. |
| **Files Affected** | `src/app/api/generate-pdf/route.ts` |

### EC-4.4.2: Concurrent PDF Generation Requests
| Field | Detail |
|-------|--------|
| **Trigger** | User clicks "Download Resume" and "Download Proof" simultaneously |
| **Symptom** | Two Playwright instances compete for resources, one may fail |
| **Handling** | Queue PDF generation requests. Disable the second download button while the first is generating. Or use a single API call that generates both PDFs and returns a zip file. |
| **Files Affected** | `src/app/export/page.tsx`, `src/app/api/generate-pdf/route.ts` |

### EC-4.4.3: Download Blocked by Browser Popup Blocker
| Field | Detail |
|-------|--------|
| **Trigger** | PDF opens in a new tab/popup which gets blocked by the browser |
| **Symptom** | User clicks download but nothing happens |
| **Handling** | Use direct download via `Content-Disposition: attachment` header, not `window.open()`. Create an `<a>` element with `download` attribute and click it programmatically. This bypasses popup blockers. |
| **Files Affected** | `src/components/export/DownloadButton.tsx` |

### EC-4.4.4: PDF Filename Contains Special Characters
| Field | Detail |
|-------|--------|
| **Trigger** | Candidate name is "José García" or company is "AT&T" or "Acme Inc." |
| **Symptom** | Filename `José_García_Tailored_Resume_AT&T.pdf` may break on some OS or filesystems |
| **Handling** | Sanitize filenames: replace accented characters with ASCII equivalents (`José` → `Jose`), remove `&`, `/`, `\`, `<`, `>`, `:`, `"`, `?`, `*`. Replace spaces with underscores. Max filename length: 100 characters. |
| **Files Affected** | `src/app/api/generate-pdf/route.ts` |

### EC-4.4.5: Missing TailoringRun Data on Export Page
| Field | Detail |
|-------|--------|
| **Trigger** | User navigates directly to `/export` without completing the pipeline |
| **Symptom** | PDF generation fails with undefined data |
| **Handling** | Same route guard as Phase 1: check for required state on mount, redirect to `/input` if missing. Show: "Please complete the analysis first." Disable download buttons until `TailoringRun` is populated. |
| **Files Affected** | `src/app/export/page.tsx` |

### EC-4.4.6: Playwright/Puppeteer Not Installed or Not Found
| Field | Detail |
|-------|--------|
| **Trigger** | Headless browser dependency is missing in the deployment environment |
| **Symptom** | `Error: Could not find browser` or `ENOENT` on Chromium path |
| **Handling** | Use `@react-pdf/renderer` as a fallback that doesn't require a browser binary. If using Playwright, ensure `playwright install chromium` runs in the deployment build step. Document in README. Detect availability at startup and log which PDF engine is active. |
| **Files Affected** | `src/app/api/generate-pdf/route.ts`, `package.json` (postinstall script) |

### EC-4.4.7: Large Payload Serialization for PDF API
| Field | Detail |
|-------|--------|
| **Trigger** | `TailoringRun` JSON payload is 500KB+ for a very long resume |
| **Symptom** | API request body exceeds default Next.js limit (1MB) or causes parsing delays |
| **Handling** | Set `bodyParser.sizeLimit: '5mb'` in the API route config. Compress the payload client-side if needed. Consider passing only the `runId` and retrieving data server-side if session storage is available. |
| **Files Affected** | `src/app/api/generate-pdf/route.ts` |

### EC-4.4.8: PDF Download Fails Silently on Mobile Safari
| Field | Detail |
|-------|--------|
| **Trigger** | Mobile Safari handles blob downloads differently than desktop browsers |
| **Symptom** | Download button click does nothing, or PDF opens inline instead of downloading |
| **Handling** | For iOS Safari, open the PDF in a new tab (`window.open(blobUrl)`) instead of using the download attribute (which Safari ignores). Detect the platform and adjust behavior accordingly. |
| **Files Affected** | `src/components/export/DownloadButton.tsx` |

---

## Quick Reference: Edge Case Checklist

Use this checklist during Phase 4 code reviews:

- [ ] PDF page breaks use `break-inside: avoid` on experience blocks
- [ ] Empty optional sections (projects, certifications) are conditionally hidden
- [ ] Font supports accented characters, emoji, and common Unicode
- [ ] ATS-friendly: no absolute positioning, no SVG inline, semantic HTML
- [ ] Proof PDF uses equal-height row cells for bullet pairs
- [ ] Unchanged bullets are dimmed/skipped in the proof PDF
- [ ] Score arrow direction matches actual change (up/down/neutral)
- [ ] Disclaimer footer appears on EVERY page
- [ ] Diff engine handles near-total rewrites (> 80% different) gracefully
- [ ] Diff uses visual treatments beyond color (strikethrough, bold) for print/accessibility
- [ ] PDF download uses `Content-Disposition: attachment`, not `window.open`
- [ ] Filenames are sanitized (no special characters, max 100 chars)
- [ ] PDF generation has a 60s timeout with graceful error handling
- [ ] Mobile Safari download behavior is handled separately
- [ ] Unconfirmed risk flags result in a "DRAFT" watermark on exported PDFs
