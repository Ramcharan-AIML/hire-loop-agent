# Phase 3 Edge Cases — The Shield (Truthfulness Guardrails)

> **Reference:** [Implementation Plan — Phase 3](../implementation-plan.md#phase-3-the-shield--truthfulness-guardrails)
>
> **Scope:** Entity-intersection checker, numeric fabrication detector, confidence & risk badges in UI, user confirmation modal.

---

## 1. Entity-Intersection Checker

### EC-3.1.1: Technology Name Variants and Aliases
| Field | Detail |
|-------|--------|
| **Trigger** | Original resume says "AWS" but tailored bullet says "Amazon Web Services", or original says "JS" and tailored says "JavaScript" |
| **Symptom** | Checker flags "Amazon Web Services" as fabricated because exact string "Amazon Web Services" ≠ "AWS" |
| **Handling** | Build an alias map of common technology synonyms: `{ "AWS": ["Amazon Web Services", "Amazon AWS"], "JS": ["JavaScript"], "k8s": ["Kubernetes"], "React.js": ["React", "ReactJS"] }`. Normalize both entity sets through the alias map before diffing. |
| **Files Affected** | `src/lib/guardrails/entity-checker.ts`, `src/lib/guardrails/aliases.ts` (new) |

### EC-3.1.2: Substring False Positives
| Field | Detail |
|-------|--------|
| **Trigger** | Original has "React" in skills. Tailored bullet says "React Native" |
| **Symptom** | Checker sees "React Native" ≠ "React" and flags it, even though partial overlap exists. Or conversely, "React" matches inside "React Native" as a false negative. |
| **Handling** | Use whole-word matching with word boundaries, not substring matching. "React" should NOT match "React Native" — they are different technologies. If the original has "React" but not "React Native", flagging "React Native" is CORRECT behavior. |
| **Files Affected** | `src/lib/guardrails/entity-checker.ts` |

### EC-3.1.3: Soft Skills vs Hard Skills Classification
| Field | Detail |
|-------|--------|
| **Trigger** | Tailored bullet adds "collaborative" or "leadership" which aren't in the original |
| **Symptom** | Checker flags soft skills at HIGH severity alongside real fabrication risks |
| **Handling** | Maintain a list of common soft skills: `["collaborative", "leadership", "communication", "problem-solving", "analytical", "mentoring", ...]`. If a new entity matches the soft skills list, downgrade severity to `LOW`. |
| **Files Affected** | `src/lib/guardrails/entity-checker.ts` |

### EC-3.1.4: Entity Extraction from Free Text Bullets
| Field | Detail |
|-------|--------|
| **Trigger** | Original bullet: "Managed cloud infrastructure" — does this count as "cloud" expertise? |
| **Symptom** | Checker struggles to extract "technologies" from narrative prose vs. a structured skills list |
| **Handling** | Primary entity set should come from structured fields (`skills[]`, `projects[].technologies[]`, `certifications[]`). Bullet text extraction is a secondary, lower-confidence source. Flag entities found ONLY in tailored bullets (not in any original structured field or bullet) at HIGH severity. |
| **Files Affected** | `src/lib/guardrails/entity-checker.ts` |

### EC-3.1.5: Case Sensitivity Issues
| Field | Detail |
|-------|--------|
| **Trigger** | Original: `"typescript"` (lowercase). Tailored: `"TypeScript"` (PascalCase) |
| **Symptom** | Checker flags TypeScript as a new entity |
| **Handling** | Normalize all entity comparisons to lowercase before diffing. |
| **Files Affected** | `src/lib/guardrails/entity-checker.ts` |

### EC-3.1.6: Checker Performance on Large Entity Sets
| Field | Detail |
|-------|--------|
| **Trigger** | Resume with 50+ skills and 30+ bullets producing 200+ entity candidates |
| **Symptom** | Checker takes longer than the 50ms target |
| **Handling** | Use `Set` for O(1) lookups. Pre-process the alias map into a flat lookup. Avoid nested loops. The algorithm should be O(n+m) not O(n*m). |
| **Files Affected** | `src/lib/guardrails/entity-checker.ts` |

### EC-3.1.7: LLM Rephrases a Technology Name Creatively
| Field | Detail |
|-------|--------|
| **Trigger** | Original: "PostgreSQL". Tailored: "relational database systems" |
| **Symptom** | "relational database systems" isn't flagged because it's a description, not a named technology — but it also doesn't match "PostgreSQL" |
| **Handling** | The checker focuses on named technologies/tools, not descriptions. "Relational database systems" is an acceptable rephrasing. Only flag when a SPECIFIC named tool/technology appears that wasn't in the original. |
| **Files Affected** | `src/lib/guardrails/entity-checker.ts` |

---

## 2. Numeric Fabrication Detector

### EC-3.2.1: Date Numbers Causing False Positives
| Field | Detail |
|-------|--------|
| **Trigger** | Tailored bullet: "In 2023, improved system uptime" — "2023" is flagged as a fabricated number |
| **Symptom** | Noise in the flagging system, user loses trust in guardrails |
| **Handling** | Exclude numbers that look like years (4-digit numbers between 1990-2030), version numbers (e.g., "3.0", "v2"), and ordinals (e.g., "1st", "2nd"). Use regex pattern: exclude `\b(19|20)\d{2}\b` and `v?\d+\.\d+`. |
| **Files Affected** | `src/lib/guardrails/numeric-checker.ts` |

### EC-3.2.2: Same Number in Different Context
| Field | Detail |
|-------|--------|
| **Trigger** | Original: "Managed a team of 5 engineers". Tailored: "Led 5 cross-functional team members" |
| **Symptom** | The number "5" exists in both — should NOT be flagged. But if the tailored said "Led 15 cross-functional team members", "15" should be flagged. |
| **Handling** | Extract ALL numbers from ALL original bullets into a global `originalNumbers: Set<string>`. A number in the tailored bullet is only flagged if it's not in the global set. Note: this means if original has "5" anywhere, "5" anywhere in tailored is fine. |
| **Files Affected** | `src/lib/guardrails/numeric-checker.ts` |

### EC-3.2.3: Numbers with Units or Formatting
| Field | Detail |
|-------|--------|
| **Trigger** | Original: "Saved $500K". Tailored: "Saved $500,000" or "Saved 500K" |
| **Symptom** | "500,000" ≠ "500K" in raw string comparison |
| **Handling** | Normalize numbers before comparison: strip `$`, `,`, `%`. Convert abbreviations: `K` → `000`, `M` → `000000`. Compare normalized values: `500000 === 500000` = no flag. |
| **Files Affected** | `src/lib/guardrails/numeric-checker.ts` |

### EC-3.2.4: Percentage Changed by Rounding
| Field | Detail |
|-------|--------|
| **Trigger** | Original: "Improved performance by 23.7%". Tailored: "Improved performance by 24%" |
| **Symptom** | "24" ≠ "23.7" — flagged as fabrication when it's just rounding |
| **Handling** | For percentage values, allow a ±1% tolerance. If original has "23.7" and tailored has "24", don't flag. But "23.7" → "50" should still be flagged. |
| **Files Affected** | `src/lib/guardrails/numeric-checker.ts` |

### EC-3.2.5: Multiple Numbers in a Single Bullet
| Field | Detail |
|-------|--------|
| **Trigger** | Original: "Reduced latency from 200ms to 50ms for 1M+ daily users". Tailored: "Reduced latency from 200ms to 50ms for 1M+ daily active users, improving throughput by 4x" |
| **Symptom** | "4x" is new — was "4x" implied by going from 200ms to 50ms? |
| **Handling** | Flag "4x" as a new derived metric. Even if the math checks out (200/50=4), the original didn't claim "4x" — the user must verify. Set severity to `MEDIUM` with note: "This metric appears to be derived from existing numbers but was not explicitly stated in the original." |
| **Files Affected** | `src/lib/guardrails/numeric-checker.ts` |

### EC-3.2.6: No Numbers in Original, Numbers in Tailored
| Field | Detail |
|-------|--------|
| **Trigger** | Original: "Built REST APIs". Tailored: "Built 12 REST APIs serving 500K requests/day" |
| **Symptom** | Both "12" and "500K" are completely fabricated |
| **Handling** | Flag at `HIGH` severity: "New metrics detected in tailored bullet that have no basis in the original. Please verify or remove." |
| **Files Affected** | `src/lib/guardrails/numeric-checker.ts` |

---

## 3. Confidence & Risk Badges in UI

### EC-3.3.1: Too Many Flags Overwhelming the User
| Field | Detail |
|-------|--------|
| **Trigger** | Guardrails flag 20+ items across the resume |
| **Symptom** | User is overwhelmed and either ignores all warnings or abandons the tool |
| **Handling** | Show a summary first: "X high-risk, Y medium-risk, Z low-risk findings." Allow filtering by severity. Default: show HIGH first, collapse MEDIUM and LOW. Use progressive disclosure — don't dump everything at once. |
| **Files Affected** | `src/components/review/GuardrailSummary.tsx` |

### EC-3.3.2: Zero Flags Creates False Confidence
| Field | Detail |
|-------|--------|
| **Trigger** | Guardrails find nothing — but the tailored resume still has subtle issues |
| **Symptom** | User assumes "no flags = perfectly safe" |
| **Handling** | Even with zero flags, display: "✅ No automated warnings detected. However, always review your tailored resume carefully before submitting." Never imply 100% safety. |
| **Files Affected** | `src/components/review/GuardrailSummary.tsx` |

### EC-3.3.3: Checkbox State Not Persisting Across Page Navigation
| Field | Detail |
|-------|--------|
| **Trigger** | User confirms a risk flag checkbox, navigates to Export, then back to Review |
| **Symptom** | All checkboxes are reset, user must re-confirm everything |
| **Handling** | Store confirmation state in the global Zustand/Context store alongside the `TailoringRun` data. Persist via `sessionStorage`. |
| **Files Affected** | `src/lib/store/tailoring-store.ts`, `src/components/review/RiskBanner.tsx` |

### EC-3.3.4: Risk Banner Covers Important Content on Mobile
| Field | Detail |
|-------|--------|
| **Trigger** | On mobile viewport, a tall risk banner pushes the tailored bullet text off-screen |
| **Symptom** | User can see the warning but not the bullet it refers to |
| **Handling** | Make risk banners collapsible on mobile. Show a one-line summary with expand chevron. Ensure the corresponding bullet text is always visible alongside the warning. |
| **Files Affected** | `src/components/review/RiskBanner.tsx` |

### EC-3.3.5: Color-Blind Users Cannot Distinguish Badge Colors
| Field | Detail |
|-------|--------|
| **Trigger** | Red/green color blindness makes HIGH and SAFE badges indistinguishable |
| **Symptom** | User can't differentiate risk levels |
| **Handling** | Use icons AND text labels alongside colors: "🔴 High Risk", "🟢 Safe". Use patterns or shapes in addition to color. Ensure sufficient contrast for each badge variant. Test with a color blindness simulator. |
| **Files Affected** | `src/components/review/ConfidenceBadge.tsx`, `src/components/review/RiskBanner.tsx` |

---

## 4. User Confirmation Modal

### EC-3.4.1: Modal Dismissed Without Action (Clicking Outside)
| Field | Detail |
|-------|--------|
| **Trigger** | User clicks outside the modal overlay, or presses Escape |
| **Symptom** | Modal closes, user proceeds to export without confirming |
| **Handling** | Prevent modal dismissal on outside click. Escape should close but NOT confirm. Export button remains disabled until explicit confirmation. Modal should have `closeOnOverlayClick={false}`. |
| **Files Affected** | `src/components/review/ConfirmationModal.tsx` |

### EC-3.4.2: All Flags Confirmed But User Hasn't Scrolled Through List
| Field | Detail |
|-------|--------|
| **Trigger** | User clicks "Confirm All" without reading individual flags (20+ flags in the modal) |
| **Symptom** | Rubber-stamp confirmation defeats the purpose of guardrails |
| **Handling** | For 5+ high-risk flags, show a secondary confirmation: "You are confirming X high-risk items. Are you sure you've reviewed each one?" Optionally, require a brief scroll through the list before enabling "Confirm All". |
| **Files Affected** | `src/components/review/ConfirmationModal.tsx` |

### EC-3.4.3: Modal Accessibility (Screen Reader Support)
| Field | Detail |
|-------|--------|
| **Trigger** | Screen reader users interact with the confirmation modal |
| **Symptom** | Focus is not trapped, ARIA labels are missing, checkbox states not announced |
| **Handling** | Use `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby`. Trap focus within the modal. Auto-focus the first interactive element. Announce checkbox state changes with `aria-checked`. |
| **Files Affected** | `src/components/review/ConfirmationModal.tsx` |

### EC-3.4.4: Export Triggered Programmatically (Bypassing Modal)
| Field | Detail |
|-------|--------|
| **Trigger** | Developer or power user calls the export API directly, bypassing the UI modal check |
| **Symptom** | PDF generated with unconfirmed high-risk content |
| **Handling** | The `/api/generate-pdf` route should accept a `confirmedRiskIds: string[]` parameter. If high-risk flags exist but none are confirmed, the API should return a 403: "Unconfirmed risk flags. Please confirm before exporting." The check must be server-side, not just client-side. |
| **Files Affected** | `src/app/api/generate-pdf/route.ts` (Phase 4) |

### EC-3.4.5: User Unchecks a Previously Confirmed Flag
| Field | Detail |
|-------|--------|
| **Trigger** | User confirms flag #3, then goes back and unchecks it |
| **Symptom** | Export should be re-blocked but might still be enabled |
| **Handling** | Re-evaluate export eligibility whenever ANY checkbox state changes. Export button state = `allHighRiskFlagsConfirmed()` check that runs reactively. |
| **Files Affected** | `src/components/review/ConfirmationModal.tsx`, `src/components/export/DownloadButton.tsx` (Phase 4) |

---

## Quick Reference: Edge Case Checklist

Use this checklist during Phase 3 code reviews:

- [ ] Entity checker normalizes casing (lowercase comparison)
- [ ] Entity checker has an alias map for common technology synonyms (AWS/Amazon Web Services, JS/JavaScript)
- [ ] Entity checker uses whole-word matching, not substring matching
- [ ] Soft skills are flagged at LOW severity, not HIGH
- [ ] Numeric checker excludes years (1990-2030), version numbers, and ordinals
- [ ] Numeric checker normalizes `$`, `,`, `K`, `M` before comparison
- [ ] Numeric checker allows ±1% tolerance on percentages
- [ ] Risk badge colors are accompanied by icons AND text labels for accessibility
- [ ] Zero flags still show a "please review" message
- [ ] Risk confirmation checkboxes persist in session state across navigation
- [ ] Confirmation modal cannot be dismissed by clicking outside
- [ ] "Confirm All" with 5+ high-risk items requires secondary confirmation
- [ ] Modal meets ARIA accessibility requirements (focus trap, labels, announcements)
- [ ] Export eligibility is re-evaluated on every checkbox state change
