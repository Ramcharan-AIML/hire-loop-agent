export type GuardrailSeverity = "high" | "medium" | "low" | "safe";

export interface EntityViolation {
  entity: string;
  type: "technology" | "certification" | "soft_skill";
  severity: GuardrailSeverity;
  message: string;
  experienceIndex?: number; // index in tailoredExperience
  projectIndex?: number;    // index in tailoredProjects
  bulletIndex?: number;     // index of bullet inside experience/project
}

export interface NumericViolation {
  number: string;
  severity: GuardrailSeverity;
  message: string;
  experienceIndex?: number; // index in tailoredExperience
  projectIndex?: number;    // index in tailoredProjects
  bulletIndex?: number;     // index of bullet inside experience/project
}

export interface GuardrailResult {
  entityViolations: EntityViolation[];
  numericViolations: NumericViolation[];
  highestSeverity: GuardrailSeverity;
}
