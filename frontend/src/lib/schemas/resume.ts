import { z } from "zod";

export const ContactSchema = z.object({
  fullName: z.string().catch("Candidate").default("Candidate").transform(v => !v || v.trim() === "" ? "Candidate" : v),
  email: z.string().nullable().optional().default("").transform(v => v ?? ""),
  phone: z.string().nullable().optional().default("").transform(v => v ?? ""),
  location: z.string().nullable().optional().default("").transform(v => v ?? ""),
  links: z.array(z.string()).default([]),
});

export const WorkExperienceSchema = z.object({
  company: z.string().catch("Company").default("Company").transform(v => !v || v.trim() === "" ? "Company" : v),
  title: z.string().catch("Position").default("Position").transform(v => !v || v.trim() === "" ? "Position" : v),
  location: z.string().nullable().optional().default("").transform(v => v ?? ""),
  startDate: z.string().catch("N/A").default("N/A").transform(v => !v || v.trim() === "" ? "N/A" : v),
  endDate: z.string().catch("Present").default("Present").transform(v => !v || v.trim() === "" ? "Present" : v),
  bullets: z.array(z.string()).default([]),
});

export const ProjectSchema = z.object({
  name: z.string().catch("Project").default("Project").transform(v => !v || v.trim() === "" ? "Project" : v),
  description: z.string().nullable().optional().default("").transform(v => v ?? ""),
  bullets: z.array(z.string()).default([]),
  technologies: z.array(z.string()).default([]),
});

export const EducationSchema = z.object({
  institution: z.string().catch("Institution").default("Institution").transform(v => !v || v.trim() === "" ? "Institution" : v),
  degree: z.string().catch("Degree").default("Degree").transform(v => !v || v.trim() === "" ? "Degree" : v),
  fieldOfStudy: z.string().nullable().optional().default("").transform(v => v ?? ""),
  graduationDate: z.string().catch("N/A").default("N/A").transform(v => !v || v.trim() === "" ? "N/A" : v),
  gpa: z.string().nullable().optional().default("").transform(v => v ?? ""),
});

export const ResumeProfileSchema = z.object({
  contact: ContactSchema,
  summary: z.string().nullable().optional().default("").transform(v => v ?? ""),
  skills: z.array(z.string()).default([]),
  experience: z.array(WorkExperienceSchema).default([]),
  projects: z.array(ProjectSchema).default([]),
  education: z.array(EducationSchema).default([]),
  certifications: z.array(z.string()).default([]),
});

export type Contact = z.infer<typeof ContactSchema>;
export type WorkExperience = z.infer<typeof WorkExperienceSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type Education = z.infer<typeof EducationSchema>;
export type ResumeProfile = z.infer<typeof ResumeProfileSchema>;
