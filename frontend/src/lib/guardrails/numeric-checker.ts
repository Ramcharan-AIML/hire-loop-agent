import { ResumeProfile } from "../schemas/resume";
import { TailoredResume } from "../schemas/tailored-resume";
import { NumericViolation } from "./types";

// Helper to check if a string is a standard year (e.g. 1995-2035)
function isYear(str: string): boolean {
  const num = parseInt(str, 10);
  return !isNaN(num) && num >= 1990 && num <= 2035;
}

// Helper to check if a number is part of a standard version pattern
function isVersionOrDatePattern(str: string, index: number, fullText: string): boolean {
  // Check if preceded by common version markers
  const contextBefore = fullText.substring(Math.max(0, index - 15), index).toLowerCase();
  if (
    contextBefore.includes("version") || 
    contextBefore.includes("react") || 
    contextBefore.includes("next") || 
    contextBefore.includes("node") || 
    contextBefore.includes("python") || 
    contextBefore.includes("java") || 
    contextBefore.includes("v.") || 
    /\bv\s*$/i.test(contextBefore)
  ) {
    return true;
  }
  
  // Check if it looks like a version number with sub-decimals (e.g., 16.2)
  const isDecimal = str.includes(".");
  if (isDecimal) {
    return true;
  }

  return false;
}

/**
 * Extracts all metric numbers from a bullet text.
 */
function extractMetricNumbers(text: string): { value: string; index: number }[] {
  const numbers: { value: string; index: number }[] = [];
  const regex = /\b\d+(?:\.\d+)?\b/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const value = match[0];
    const index = match.index;

    // Filter out common non-metric numbers
    if (isYear(value)) continue;
    if (isVersionOrDatePattern(value, index, text)) continue;

    numbers.push({ value, index });
  }

  return numbers;
}

/**
 * Checks for numeric fabrication by comparing original and tailored bullets.
 * Flags any new metrics introduced in the tailored text that were not present originally.
 */
export function checkNumericFabrication(
  original: ResumeProfile,
  tailored: TailoredResume
): NumericViolation[] {
  const violations: NumericViolation[] = [];

  // Audits tailored experience bullets
  tailored.tailoredExperience.forEach((exp, expIdx) => {
    // Locate corresponding original experience by company and title to match bullets
    const origExp = original.experience.find(
      oe => oe.company.toLowerCase().trim() === exp.company.toLowerCase().trim() &&
            oe.title.toLowerCase().trim() === exp.title.toLowerCase().trim()
    );

    exp.bullets.forEach((bullet, bulletIdx) => {
      // Find original bullet text
      const originalText = origExp?.bullets[bulletIdx] || "";
      const originalNumbers = new Set(extractMetricNumbers(originalText).map(n => n.value));
      const tailoredNumbers = extractMetricNumbers(bullet.tailored);

      // Check if tailored bullet introduced new numbers
      tailoredNumbers.forEach(n => {
        if (!originalNumbers.has(n.value)) {
          violations.push({
            number: n.value,
            severity: "high",
            message: `Potential metrics fabrication: The number "${n.value}" was introduced in the tailored bullet but is not found in the original bullet.`,
            experienceIndex: expIdx,
            bulletIndex: bulletIdx
          });
        }
      });
    });
  });

  // Audits tailored project bullets
  if (tailored.tailoredProjects) {
    tailored.tailoredProjects.forEach((proj, projIdx) => {
      const origProj = original.projects.find(
        op => op.name.toLowerCase().trim() === proj.name.toLowerCase().trim()
      );

      proj.bullets.forEach((bullet, bulletIdx) => {
        const originalText = origProj?.bullets[bulletIdx] || "";
        const originalNumbers = new Set(extractMetricNumbers(originalText).map(n => n.value));
        const tailoredNumbers = extractMetricNumbers(bullet.tailored);

        tailoredNumbers.forEach(n => {
          if (!originalNumbers.has(n.value)) {
            violations.push({
              number: n.value,
              severity: "high",
              message: `Potential metrics fabrication: The number "${n.value}" was introduced in the tailored bullet but is not found in the original bullet.`,
              projectIndex: projIdx,
              bulletIndex: bulletIdx
            });
          }
        });
      });
    });
  }

  return violations;
}
