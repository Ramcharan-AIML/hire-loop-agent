import { diffWords } from "diff";

export interface DiffSegment {
  type: "unchanged" | "added" | "removed";
  value: string;
}

/**
 * Computes word-level diffs between two strings.
 * Returns an array of styled segments.
 */
export function computeWordDiff(original: string, tailored: string): DiffSegment[] {
  if (!original) original = "";
  if (!tailored) tailored = "";

  const diffs = diffWords(original, tailored);
  return diffs.map((part) => {
    let type: "unchanged" | "added" | "removed" = "unchanged";
    if (part.added) {
      type = "added";
    } else if (part.removed) {
      type = "removed";
    }
    return {
      type,
      value: part.value,
    };
  });
}
