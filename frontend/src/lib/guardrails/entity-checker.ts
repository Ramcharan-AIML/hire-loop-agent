import { ResumeProfile } from "../schemas/resume";
import { TailoredResume } from "../schemas/tailored-resume";
import { EntityViolation, GuardrailSeverity } from "./types";

// Standard soft skills vocabulary to classify soft skill additions as LOW severity
const COMMON_SOFT_SKILLS = new Set([
  "leadership", "communication", "collaboration", "management", "teamwork",
  "agile", "scrum", "problem solving", "organization", "creativity",
  "adaptability", "critical thinking", "interpersonal", "conflict resolution",
  "time management", "negotiation", "mentorship", "coaching"
]);

// Helper to escape regex special characters
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Deterministically checks for newly added technologies, tools, certifications, or soft skills
 * in the tailored resume that were not present anywhere in the original resume.
 */
export function checkEntityIntersection(
  original: ResumeProfile,
  tailored: TailoredResume
): EntityViolation[] {
  const violations: EntityViolation[] = [];

  // 1. Build the search space of all original text for lookup
  const originalTextParts: string[] = [
    original.summary || "",
    ...original.skills,
    ...original.certifications,
    ...original.experience.map(exp => `${exp.company} ${exp.title} ${exp.location || ""} ${exp.bullets.join(" ")}`),
    ...original.projects.map(proj => `${proj.name} ${proj.description || ""} ${proj.bullets.join(" ")} ${proj.technologies.join(" ")}`),
    ...original.education.map(edu => `${edu.institution} ${edu.degree} ${edu.fieldOfStudy || ""}`)
  ];
  const originalFullText = originalTextParts.join(" ").toLowerCase();

  // Helper to check if a word/phrase exists in the original resume
  const existsInOriginal = (entity: string): boolean => {
    const cleanEntity = entity.toLowerCase().trim();
    if (!cleanEntity) return true;
    
    // Exact word boundary search
    const escaped = escapeRegExp(cleanEntity);
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    return regex.test(originalFullText);
  };

  // 2. Identify candidate entities to audit from the tailored resume's skills list and bullets
  // We extract all words and multi-word phrases from tailored skills as our primary entities
  const tailoredSkillsSet = new Set(tailored.tailoredSkills.map(s => s.toLowerCase().trim()));
  
  // Audits tailored experience bullets
  tailored.tailoredExperience.forEach((exp, expIdx) => {
    exp.bullets.forEach((bullet, bulletIdx) => {
      // Find which tailored skills are mentioned in this bullet
      tailoredSkillsSet.forEach(skill => {
        const escaped = escapeRegExp(skill);
        const regex = new RegExp(`\\b${escaped}\\b`, "i");
        
        if (regex.test(bullet.tailored.toLowerCase())) {
          // If the skill is in this tailored bullet, check if it was in the original resume
          if (!existsInOriginal(skill)) {
            const isCert = /certif|degree|licens|certified/i.test(skill);
            const isSoft = COMMON_SOFT_SKILLS.has(skill.toLowerCase());
            
            let severity: GuardrailSeverity = "high";
            let type: "technology" | "certification" | "soft_skill" = "technology";
            let message = `Potential fabrication: Technology "${skill}" mentioned in tailored bullet is not found in your original experience.`;
            
            if (isCert) {
              severity = "high";
              type = "certification";
              message = `Fabrication alert: Certification "${skill}" mentioned in tailored bullet is not found in your original certifications.`;
            } else if (isSoft) {
              severity = "low";
              type = "soft_skill";
              message = `Alignment warning: Soft skill "${skill}" added for vocabulary alignment (Low risk).`;
            }
            
            violations.push({
              entity: skill,
              type,
              severity,
              message,
              experienceIndex: expIdx,
              bulletIndex: bulletIdx
            });
          }
        }
      });
    });
  });

  // Audits tailored project bullets
  if (tailored.tailoredProjects) {
    tailored.tailoredProjects.forEach((proj, projIdx) => {
      proj.bullets.forEach((bullet, bulletIdx) => {
        tailoredSkillsSet.forEach(skill => {
          const escaped = escapeRegExp(skill);
          const regex = new RegExp(`\\b${escaped}\\b`, "i");
          
          if (regex.test(bullet.tailored.toLowerCase())) {
            if (!existsInOriginal(skill)) {
              const isCert = /certif|degree|licens|certified/i.test(skill);
              const isSoft = COMMON_SOFT_SKILLS.has(skill.toLowerCase());
              
              let severity: GuardrailSeverity = "high";
              let type: "technology" | "certification" | "soft_skill" = "technology";
              let message = `Potential fabrication: Technology "${skill}" mentioned in tailored bullet is not found in your original projects.`;
              
              if (isCert) {
                severity = "high";
                type = "certification";
                message = `Fabrication alert: Certification "${skill}" mentioned in tailored bullet is not found in your original certifications.`;
              } else if (isSoft) {
                severity = "low";
                type = "soft_skill";
                message = `Alignment warning: Soft skill "${skill}" added for vocabulary alignment (Low risk).`;
              }
              
              violations.push({
                entity: skill,
                type,
                severity,
                message,
                projectIndex: projIdx,
                bulletIndex: bulletIdx
              });
            }
          }
        });
      });
    });
  }

  return violations;
}
