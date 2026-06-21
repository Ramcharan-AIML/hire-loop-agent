import { JobDescriptionProfile } from "../schemas/job-description";

export const sampleJD: JobDescriptionProfile = {
  jobTitle: "Senior Frontend Engineer",
  company: "ApexCloud Platforms",
  requiredSkills: ["React", "TypeScript", "Next.js", "Tailwind CSS", "CI/CD", "State Management"],
  preferredSkills: ["Framer Motion", "Playwright", "Web Vitals Optimization", "UX Design principles"],
  responsibilities: [
    "Engineer premium, highly interactive user interfaces from the ground up using React and Next.js App Router.",
    "Implement sleek styling with Tailwind CSS, establishing responsive, modern layouts with smooth micro-animations.",
    "Utilize TypeScript strictly to enforce robust, bug-free components and API boundary schemas.",
    "Optimize Core Web Vitals to achieve high SEO performance and page rendering scores.",
    "Write thorough automated tests using Playwright and maintain standard CI/CD deployment pipelines.",
  ],
  qualifications: [
    "5+ years of software development experience with a strong focus on professional frontend application building.",
    "Expertise in state management, asynchronous side-effects, and TypeScript definitions.",
  ],
  tools: ["React", "Next.js", "TypeScript", "Tailwind CSS", "Playwright", "Git", "Webpack"],
  keywords: ["Tailwind", "Next.js", "TypeScript", "Core Web Vitals", "Playwright", "Automated Testing", "CI/CD"],
  seniorityLevel: "senior",
  domainSignals: ["SaaS", "Enterprise Cloud Platforms", "High-performance dashboard layouts"],
};
