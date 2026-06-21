# PROMPT 1 — Build the Resume Shapeshifter Foundation

## ⚠️ CRITICAL — READ THIS FIRST (DO NOT SKIP)

**This prompt is fully self-contained. Everything you need is in this prompt. Do not look anywhere else.**

**Strict scope rules — you MUST follow all of these:**

1. Work ONLY inside the current directory. Do NOT read, list, glob, grep, or otherwise inspect any sibling, parent, or other directory on the user's machine.
2. Do NOT look for existing `.env`, `.env.local`, `package.json`, `node_modules`, or any other file in any other folder — even if the folder has a similar name like "resume_builder_4", "shapeshifter_old", "resume_builder_5", etc.
3. Do NOT search for or reuse API keys, secrets, or configuration from any other project on this machine.
4. Treat the current directory as empty. Do NOT assume any existing files are there.
5. Create files ONLY using the contents specified in this prompt — character-for-character — in the current directory.
6. Do NOT modify, read, or create anything outside this directory.
7. Do NOT install packages globally. Run `npm install` only inside the current directory.

**About `.env.local`:** create it with the EXACT placeholder values shown in this prompt (e.g. `PASTE_YOUR_GROQ_KEY_HERE`). The USER will paste their own real API keys manually after you finish. Do NOT search for real keys anywhere. Do NOT auto-populate any key. Do NOT use a different placeholder format than what's shown.

**DO NOT run, test, or verify the project after building. Specifically:**

8. After creating all files, run ONLY ONE command: `npm install` in the current directory. Wait for it to finish. Then STOP.
9. Do NOT run `npm run dev`. Do NOT run `npm run build`. Do NOT run `npx tsc`. Do NOT run `npm run lint`. Do NOT start any dev server.
10. Do NOT open a browser. Do NOT make HTTP requests. Do NOT use `curl`, `fetch`, Playwright, Puppeteer, or any browser automation tool.
11. Do NOT take screenshots. Do NOT poll endpoints. Do NOT monitor logs. Do NOT spawn background processes.
12. Do NOT loop to "fix" any imagined error. If `npm install` succeeds, you are done. Stop and report.

After `npm install` completes, output one short message: "Setup complete. Open `.env.local`, paste your Groq API key, then run `npm run dev` to test." That is your final action. STOP there.

If any step fails (e.g. a permission error), STOP and report the failure. Do NOT improvise by looking in other folders or trying alternative commands.

---

Create a complete Next.js 16 AI web application called **"Resume Shapeshifter"** in the current directory. This is a single-page app where the user pastes their resume and a job description, an AI tailors the resume to better match the job, shows a side-by-side comparison with scoring + gap analysis, and lets them download a tailored resume PDF.

Create every file EXACTLY as shown below. Do NOT add any extra files, do NOT modify any code, do NOT add comments beyond what is shown. Create each file one by one in the exact paths shown. The design is a clean LIGHT theme — white background, indigo accents.

---

## PROJECT STRUCTURE

```
.
├── package.json
├── tsconfig.json
├── next.config.ts
├── next-env.d.ts
├── postcss.config.mjs
├── .env.local
├── .env.example
├── .gitignore
└── src/
    ├── app/
    │   ├── globals.css
    │   ├── layout.tsx
    │   ├── page.tsx
    │   └── api/
    │       ├── tailor/
    │       │   └── route.ts
    │       └── generate-pdf/
    │           └── route.ts
    └── lib/
        ├── schema.ts
        ├── groq.ts
        ├── store.ts
        └── pdf-templates.tsx
```

---

## ROOT FILES

### File: `package.json`

```json
{
  "name": "resume-shapeshifter",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "@react-pdf/renderer": "^4.1.6",
    "groq-sdk": "^0.30.0",
    "lucide-react": "^0.469.0",
    "next": "^16.2.6",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "zod": "^4.4.3",
    "zustand": "^5.0.14"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

### File: `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### File: `next.config.ts`

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
```

### File: `next-env.d.ts`

```typescript
/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.
```

### File: `postcss.config.mjs`

```javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

### File: `.env.local`

```
GROQ_API_KEY=PASTE_YOUR_GROQ_KEY_HERE
GEMINI_API_KEY=PASTE_YOUR_GEMINI_KEY_HERE
GROQ_MODEL=llama-3.3-70b-versatile
GEMINI_MODEL=gemini-2.0-flash
```

### File: `.env.example`

```
# Groq (used by Prompts 1 and 2): get a free key from https://console.groq.com/keys
GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile

# Gemini (used by Prompt 3 — Mock Interview): get a free key from https://aistudio.google.com/apikey
# Different provider = independent rate limit pool. No second Groq account needed.
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash
```

### File: `.gitignore`

```
# dependencies
node_modules
.pnp
.pnp.js

# testing
coverage

# next.js
.next/
out/

# production
build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
```

---

## SOURCE FILES

### File: `src/app/globals.css`

```css
@import "tailwindcss";

@theme inline {
  --color-background: #ffffff;
  --color-foreground: #0f172a;
  --color-surface: #ffffff;
  --color-surface-muted: #f8fafc;
  --color-border: #e2e8f0;
  --color-accent: #4f46e5;
  --color-accent-hover: #4338ca;
  --color-success: #059669;
  --color-warning: #d97706;
  --color-danger: #e11d48;
}

html,
body {
  background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
  color: #0f172a;
  min-height: 100%;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
    Ubuntu, Cantarell, sans-serif;
  -webkit-font-smoothing: antialiased;
}

@keyframes shapeshifter-fade-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in {
  animation: shapeshifter-fade-in 0.4s ease-out forwards;
}
```

### File: `src/app/layout.tsx`

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resume Shapeshifter",
  description:
    "AI that tailors your resume to any job description in seconds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

### File: `src/lib/schema.ts`

```typescript
import { z } from "zod";

export const TailoringResultSchema = z.object({
  score: z.object({
    original: z.number().int().min(0).max(100),
    tailored: z.number().int().min(0).max(100),
    explanation: z.string().min(10),
  }),
  jdSummary: z.object({
    jobTitle: z.string().min(1),
    company: z.string().default(""),
    requiredSkills: z.array(z.string()).default([]),
    preferredSkills: z.array(z.string()).default([]),
  }),
  candidate: z.object({
    name: z.string().min(1),
    location: z.string().default(""),
    phone: z.string().default(""),
    email: z.string().default(""),
    profile: z.string().min(20),
  }),
  education: z
    .array(
      z.object({
        institution: z.string().min(1),
        degree: z.string().min(1),
        dates: z.string().default(""),
        location: z.string().default(""),
      })
    )
    .default([]),
  projects: z
    .array(
      z.object({
        name: z.string().min(1),
        techStack: z.string().default(""),
        bullets: z.array(z.string().min(1)).min(1),
      })
    )
    .default([]),
  skills: z
    .array(
      z.object({
        category: z.string().min(1),
        items: z.array(z.string().min(1)).min(1),
      })
    )
    .default([]),
  certifications: z.array(z.string().min(1)).default([]),
  tailoredBullets: z
    .array(
      z.object({
        original: z.string().min(1),
        tailored: z.string().min(1),
        changeReason: z.string().min(1),
        confidence: z.enum(["high", "medium", "low"]),
      })
    )
    .min(1)
    .max(8),
  gaps: z
    .array(
      z.object({
        name: z.string().min(1),
        importance: z.enum(["high", "medium", "low"]),
        suggestedAction: z.string().min(1),
      })
    )
    .max(6),
});

export type TailoringResult = z.infer<typeof TailoringResultSchema>;
```

### File: `src/lib/groq.ts`

```typescript
import Groq from "groq-sdk";
import { TailoringResult, TailoringResultSchema } from "./schema";

const SYSTEM_PROMPT = `You are an expert resume coach AND resume parser. Given a candidate's resume and a target job description, you will:

(1) PARSE the resume into structured sections (name, contact, profile, education, projects, skills, certifications).
(2) TAILOR the profile summary AND project bullets to better match the job description.
(3) SCORE the match and identify gaps.
(4) Output everything as STRICT JSON matching the schema below.

ABSOLUTE RULES:
1. NEVER invent skills, technologies, employers, certifications, metrics, or experience that are not in the resume.
2. candidate.name, candidate.location, candidate.phone, candidate.email must be extracted EXACTLY as written in the resume.
3. candidate.profile must be a TAILORED 2-4 sentence summary emphasizing JD-relevant experience the candidate actually has. Rewrite the original profile/summary to better match the JD without inventing content.
4. Each project in projects[] must include name, techStack (comma-separated), and 2-4 TAILORED bullets. Rewrite bullets to highlight JD-relevant aspects while staying truthful.
5. Education entries: extract institution, degree, dates, location exactly as in the resume.
6. Skills: GROUP into natural categories (e.g., "Frontend", "Backend", "Tools", "UI Libraries", "Languages", "Cloud", "Databases"). Use the categories the resume uses, or sensible defaults based on the items.
7. Certifications: extract each as one entry in the array, including the issuer when present.
8. tailoredBullets[] is a separate side-by-side view for the UI. Pick the 4-6 most impactful project-bullet rewrites (with original vs tailored vs reason vs confidence).
9. Keep gaps to the top 4 most important.
10. Score honestly out of 100. The tailored score should beat the original by 10+ points when the tailoring is meaningful.
11. Output ONLY a JSON object. No markdown fences. No prose before or after.

OUTPUT SCHEMA (return JSON with EXACTLY these fields):
{
  "score": {
    "original": <int 0-100>,
    "tailored": <int 0-100>,
    "explanation": "<2-3 sentences>"
  },
  "jdSummary": {
    "jobTitle": "<string>",
    "company": "<string or empty>",
    "requiredSkills": ["..."],
    "preferredSkills": ["..."]
  },
  "candidate": {
    "name": "<full name from resume>",
    "location": "<city, state or empty>",
    "phone": "<phone or empty>",
    "email": "<email or empty>",
    "profile": "<TAILORED 2-4 sentence summary>"
  },
  "education": [
    {
      "institution": "<school name>",
      "degree": "<degree title>",
      "dates": "<start - end>",
      "location": "<city, state or empty>"
    }
  ],
  "projects": [
    {
      "name": "<project name>",
      "techStack": "<comma separated technologies>",
      "bullets": ["<tailored bullet 1>", "<tailored bullet 2>"]
    }
  ],
  "skills": [
    { "category": "Frontend", "items": ["..."] },
    { "category": "Backend", "items": ["..."] }
  ],
  "certifications": ["<cert name and issuer>", "..."],
  "tailoredBullets": [
    {
      "original": "<original bullet from resume>",
      "tailored": "<rewritten bullet>",
      "changeReason": "<brief why>",
      "confidence": "high" | "medium" | "low"
    }
  ],
  "gaps": [
    {
      "name": "<gap topic>",
      "importance": "high" | "medium" | "low",
      "suggestedAction": "<actionable suggestion>"
    }
  ]
}

Output ONLY the JSON object. No markdown fences. No prose.`;

function buildUserPrompt(resumeText: string, jdText: string): string {
  return [
    "## CANDIDATE RESUME",
    "",
    resumeText.trim(),
    "",
    "## TARGET JOB DESCRIPTION",
    "",
    jdText.trim(),
    "",
    "Now parse the resume, tailor it to the JD, and output the full JSON object.",
  ].join("\n");
}

export async function tailorResume(
  resumeText: string,
  jdText: string
): Promise<TailoringResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is missing in .env.local");
  }

  const model = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
  const client = new Groq({ apiKey });
  const userPrompt = buildUserPrompt(resumeText, jdText);

  for (let attempt = 1; attempt <= 2; attempt++) {
    const extraSystem =
      attempt === 1
        ? ""
        : "\n\nYour previous response failed schema validation. Output STRICT JSON only this time, matching the schema exactly. Every required field must be present and correctly typed.";

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT + extraSystem },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 5000,
      response_format: { type: "json_object" },
    });

    const raw = response.choices?.[0]?.message?.content ?? "";
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      if (attempt === 2) {
        throw new Error("Groq returned non-JSON output twice.");
      }
      continue;
    }

    const result = TailoringResultSchema.safeParse(parsed);
    if (result.success) {
      return result.data;
    }
    if (attempt === 2) {
      throw new Error(
        "Groq response failed schema validation twice. " +
          result.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; ")
      );
    }
  }

  throw new Error("Unexpected exit from Groq retry loop.");
}
```

### File: `src/lib/store.ts`

```typescript
"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { TailoringResult } from "./schema";

interface ShapeshifterStore {
  result: TailoringResult | null;
  resumeText: string;
  jdText: string;
  setResult: (
    result: TailoringResult,
    resumeText: string,
    jdText: string
  ) => void;
  clear: () => void;
}

export const useShapeshifterStore = create<ShapeshifterStore>()(
  persist(
    (set) => ({
      result: null,
      resumeText: "",
      jdText: "",
      setResult: (result, resumeText, jdText) =>
        set({ result, resumeText, jdText }),
      clear: () =>
        set({ result: null, resumeText: "", jdText: "" }),
    }),
    {
      name: "resume-shapeshifter",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        result: state.result,
        resumeText: state.resumeText,
        jdText: state.jdText,
      }),
    }
  )
);

export function useHasHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const unsub = useShapeshifterStore.persist.onFinishHydration(() =>
      setHydrated(true)
    );
    if (useShapeshifterStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return () => {
      unsub();
    };
  }, []);
  return hydrated;
}
```

### File: `src/lib/pdf-templates.tsx`

```tsx
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { TailoringResult } from "./schema";

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 30,
    paddingHorizontal: 42,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#0f172a",
    lineHeight: 1.4,
  },
  header: {
    textAlign: "center",
    marginBottom: 6,
  },
  name: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  location: {
    fontSize: 10,
    marginTop: 3,
    textAlign: "center",
    color: "#374151",
  },
  contactLine: {
    fontSize: 10,
    marginTop: 2,
    textAlign: "center",
    color: "#374151",
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginTop: 12,
    marginBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#0f172a",
    paddingBottom: 1,
  },
  profileText: {
    fontSize: 10,
    lineHeight: 1.45,
    marginTop: 3,
  },
  eduBlock: {
    marginTop: 5,
  },
  eduRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  eduInstitution: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
  eduDates: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
  eduDegree: {
    fontSize: 10,
    fontFamily: "Helvetica-Oblique",
  },
  eduLocation: {
    fontSize: 10,
    fontFamily: "Helvetica-Oblique",
  },
  projectBlock: {
    marginTop: 6,
  },
  projectHeaderLine: {
    fontSize: 10,
  },
  projectName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
  },
  projectTech: {
    fontFamily: "Helvetica-Oblique",
    fontSize: 10,
  },
  projectBullet: {
    fontSize: 10,
    marginTop: 2,
    marginLeft: 14,
    lineHeight: 1.4,
  },
  skillRow: {
    flexDirection: "row",
    marginTop: 3,
  },
  skillCategory: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
  },
  skillItems: {
    fontSize: 10,
    flex: 1,
  },
  bulletLine: {
    fontSize: 10,
    marginTop: 2,
    marginLeft: 14,
  },
  declarationText: {
    fontSize: 10,
    marginTop: 4,
  },
});

export function TailoredResumePdf({
  result,
}: {
  result: TailoringResult;
  resumeText?: string;
}) {
  const { candidate, education, projects, skills, certifications } = result;
  const contactParts: string[] = [];
  if (candidate.phone) contactParts.push(candidate.phone);
  if (candidate.email) contactParts.push(candidate.email);
  const contactLine = contactParts.join("   |   ");

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.name}>{candidate.name.toUpperCase()}</Text>
          {candidate.location ? (
            <Text style={styles.location}>{candidate.location}</Text>
          ) : null}
          {contactLine ? (
            <Text style={styles.contactLine}>{contactLine}</Text>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>Profile</Text>
        <Text style={styles.profileText}>{candidate.profile}</Text>

        {education.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Education</Text>
            {education.map((edu, i) => (
              <View key={i} style={styles.eduBlock}>
                <View style={styles.eduRow}>
                  <Text style={styles.eduInstitution}>{edu.institution}</Text>
                  <Text style={styles.eduDates}>{edu.dates}</Text>
                </View>
                <View style={styles.eduRow}>
                  <Text style={styles.eduDegree}>{edu.degree}</Text>
                  <Text style={styles.eduLocation}>{edu.location}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {projects.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Projects</Text>
            {projects.map((proj, i) => (
              <View key={i} style={styles.projectBlock}>
                <Text style={styles.projectHeaderLine}>
                  <Text style={styles.projectName}>{proj.name}:</Text>
                  {proj.techStack ? (
                    <Text style={styles.projectTech}>
                      {`   |   ${proj.techStack}`}
                    </Text>
                  ) : null}
                </Text>
                {proj.bullets.map((b, j) => (
                  <Text key={j} style={styles.projectBullet}>
                    {`•  ${b}`}
                  </Text>
                ))}
              </View>
            ))}
          </>
        )}

        {skills.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Technical Skills</Text>
            {skills.map((s, i) => (
              <View key={i} style={styles.skillRow}>
                <Text style={styles.skillCategory}>{s.category} : </Text>
                <Text style={styles.skillItems}>{s.items.join(", ")}</Text>
              </View>
            ))}
          </>
        )}

        {certifications.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Courses and Certifications</Text>
            {certifications.map((cert, i) => (
              <Text key={i} style={styles.bulletLine}>
                {`•  ${cert}`}
              </Text>
            ))}
          </>
        )}

        <Text style={styles.sectionTitle}>Declaration</Text>
        <Text style={styles.declarationText}>
          I hereby declare that all the given above information is true to the
          best of my knowledge.
        </Text>
      </Page>
    </Document>
  );
}

export async function renderTailoredResumeBuffer(
  result: TailoringResult,
  _resumeText: string
): Promise<Buffer> {
  return await renderToBuffer(<TailoredResumePdf result={result} />);
}
```

### File: `src/app/api/tailor/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { tailorResume } from "@/lib/groq";

export const runtime = "nodejs";
export const maxDuration = 60;

interface TailorRequestBody {
  resumeText?: unknown;
  jdText?: unknown;
}

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Add your Groq API key to .env.local (GROQ_API_KEY). Get a free key at https://console.groq.com/keys and restart the dev server.",
      },
      { status: 400 }
    );
  }

  let body: TailorRequestBody;
  try {
    body = (await req.json()) as TailorRequestBody;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON in request body." },
      { status: 400 }
    );
  }

  const resumeText = typeof body.resumeText === "string" ? body.resumeText : "";
  const jdText = typeof body.jdText === "string" ? body.jdText : "";

  if (resumeText.trim().length < 50 || jdText.trim().length < 50) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Please paste a real resume and job description (at least 50 characters each).",
      },
      { status: 400 }
    );
  }

  try {
    const result = await tailorResume(resumeText, jdText);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
```

### File: `src/app/api/generate-pdf/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { renderTailoredResumeBuffer } from "@/lib/pdf-templates";
import { TailoringResultSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

interface GeneratePdfBody {
  result?: unknown;
  resumeText?: unknown;
}

export async function POST(req: NextRequest) {
  let body: GeneratePdfBody;
  try {
    body = (await req.json()) as GeneratePdfBody;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const parsed = TailoringResultSchema.safeParse(body.result);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid tailoring result in body." },
      { status: 400 }
    );
  }
  const resumeText =
    typeof body.resumeText === "string" ? body.resumeText : "";

  try {
    const buffer = await renderTailoredResumeBuffer(parsed.data, resumeText);
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'attachment; filename="Tailored_Resume.pdf"',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "PDF render failed.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
```

### File: `src/app/page.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  Loader2,
  RotateCcw,
  Sparkles,
  Download,
} from "lucide-react";
import { useHasHydrated, useShapeshifterStore } from "@/lib/store";
import type { TailoringResult } from "@/lib/schema";

type UiState = "input" | "loading" | "results" | "error";

const confidenceColors: Record<"high" | "medium" | "low", string> = {
  high: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-rose-100 text-rose-700",
};

const importanceDot: Record<"high" | "medium" | "low", string> = {
  high: "bg-rose-500",
  medium: "bg-amber-500",
  low: "bg-sky-500",
};

export default function Page() {
  const hydrated = useHasHydrated();
  const { result, resumeText, jdText, setResult, clear } =
    useShapeshifterStore();

  const [uiState, setUiState] = useState<UiState>("input");
  const [resumeInput, setResumeInput] = useState("");
  const [jdInput, setJdInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (result) {
      setUiState("results");
    } else {
      setResumeInput(resumeText);
      setJdInput(jdText);
    }
  }, [hydrated, result, resumeText, jdText]);

  if (!hydrated) {
    return <div className="min-h-screen" />;
  }

  const canAnalyze =
    resumeInput.trim().length >= 50 && jdInput.trim().length >= 50;

  async function handleAnalyze() {
    setError(null);
    setUiState("loading");
    try {
      const res = await fetch("/api/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: resumeInput.trim(),
          jdText: jdInput.trim(),
        }),
      });
      const json = (await res.json()) as
        | { success: true; data: TailoringResult }
        | { success: false; error: string };
      if (!json.success) {
        setError(json.error);
        setUiState("error");
        return;
      }
      setResult(json.data, resumeInput.trim(), jdInput.trim());
      setUiState("results");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
      setUiState("error");
    }
  }

  async function handleDownload() {
    if (!result) return;
    setDownloading(true);
    try {
      const res = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result, resumeText }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(j?.error ?? "PDF generation failed.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Tailored_Resume.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  function handleStartOver() {
    clear();
    setResumeInput("");
    setJdInput("");
    setError(null);
    setUiState("input");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-indigo-600" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Resume Shapeshifter
          </h1>
        </div>
        {uiState === "results" && (
          <button
            onClick={handleStartOver}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <RotateCcw className="h-4 w-4" /> Start Over
          </button>
        )}
      </header>

      <p className="mt-1 text-sm text-slate-500">
        Powered by Groq + Llama 3.3 70B. Get a free key at{" "}
        <a
          href="https://console.groq.com/keys"
          target="_blank"
          rel="noreferrer"
          className="text-indigo-600 hover:underline"
        >
          console.groq.com/keys
        </a>
      </p>

      {uiState === "input" && (
        <section className="mt-10 fade-in">
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-slate-700">
                Paste your resume
              </label>
              <textarea
                value={resumeInput}
                onChange={(e) => setResumeInput(e.target.value)}
                rows={14}
                placeholder="Name, contact info, experience bullets, projects, skills…"
                className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">
                Paste the job description
              </label>
              <textarea
                value={jdInput}
                onChange={(e) => setJdInput(e.target.value)}
                rows={14}
                placeholder="Job title, company, requirements, responsibilities…"
                className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              />
            </div>
          </div>
          <div className="mt-8 flex justify-center">
            <button
              onClick={handleAnalyze}
              disabled={!canAnalyze}
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:bg-slate-300 disabled:shadow-none"
            >
              <Sparkles className="h-5 w-5" />
              Analyze with AI
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </section>
      )}

      {uiState === "loading" && (
        <section className="mt-24 flex flex-col items-center text-center fade-in">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
          <p className="mt-6 text-lg font-medium text-slate-700">
            AI is tailoring your resume…
          </p>
          <p className="mt-1 text-sm text-slate-500">
            This usually takes 10–25 seconds.
          </p>
        </section>
      )}

      {uiState === "error" && (
        <section className="mt-20 flex flex-col items-center fade-in">
          <div className="max-w-xl rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
            <p className="font-semibold">Something went wrong.</p>
            <p className="mt-2 whitespace-pre-wrap">{error}</p>
          </div>
          <button
            onClick={() => setUiState("input")}
            className="mt-6 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Try again
          </button>
        </section>
      )}

      {uiState === "results" && result && (
        <section className="mt-10 space-y-8 fade-in">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <div className="text-center">
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Original
                </p>
                <p className="text-4xl font-bold text-slate-700">
                  {result.score.original}
                  <span className="text-xl text-slate-400">/100</span>
                </p>
              </div>
              <ArrowRight className="h-8 w-8 text-indigo-500" />
              <div className="text-center">
                <p className="text-xs uppercase tracking-wider text-indigo-600">
                  Tailored
                </p>
                <p className="text-4xl font-bold text-indigo-600">
                  {result.score.tailored}
                  <span className="text-xl text-indigo-300">/100</span>
                </p>
              </div>
            </div>
            <p className="mx-auto mt-4 max-w-3xl text-center text-sm text-slate-600">
              {result.score.explanation}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              {result.jdSummary.jobTitle}
            </h2>
            {result.jdSummary.company && (
              <p className="text-sm text-slate-500">
                {result.jdSummary.company}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {result.jdSummary.requiredSkills.map((s) => (
                <span
                  key={`r-${s}`}
                  className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700"
                >
                  {s}
                </span>
              ))}
              {result.jdSummary.preferredSkills.map((s) => (
                <span
                  key={`p-${s}`}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-base font-semibold text-slate-900">
              Tailored Bullets
            </h3>
            <div className="grid gap-4 lg:grid-cols-2">
              {result.tailoredBullets.map((b, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Original
                  </p>
                  <p className="mt-1 text-sm text-slate-500 line-through">
                    {b.original}
                  </p>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-emerald-600">
                    Tailored
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {b.tailored}
                  </p>
                  <p className="mt-3 text-xs italic text-slate-500">
                    Why: {b.changeReason}
                  </p>
                  <div className="mt-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${confidenceColors[b.confidence]}`}
                    >
                      {b.confidence} confidence
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {result.gaps.length > 0 && (
            <div>
              <h3 className="mb-3 text-base font-semibold text-slate-900">
                Gaps to Address
              </h3>
              <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                {result.gaps.map((g, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 border-b border-slate-100 p-3 last:border-b-0"
                  >
                    <span
                      className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${importanceDot[g.importance]}`}
                    />
                    <div className="text-sm">
                      <span className="font-semibold text-slate-900">
                        {g.name}
                      </span>
                      <span className="text-slate-600">
                        {" "}
                        — {g.suggestedAction}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-center pt-2">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:bg-slate-300"
            >
              {downloading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Download className="h-5 w-5" />
              )}
              Download Tailored Resume PDF
            </button>
          </div>

          {error && (
            <p className="text-center text-sm text-rose-600">{error}</p>
          )}
        </section>
      )}
    </main>
  );
}
```

---

## AFTER ALL FILES ARE CREATED — RUN ONLY THIS ONE COMMAND

In the project root, run:

```
npm install
```

That is the ONLY command you (the agent) should run. Wait for it to finish. Then STOP.

Do NOT run `npm run dev`. Do NOT open a browser. Do NOT test anything. Output one final message: `"Setup complete. The user should now open .env.local, paste their Groq API key, then run npm run dev manually."` Then end your turn.

---

## VERIFICATION CHECKLIST — FOR THE USER ONLY (DO NOT EXECUTE THIS AS THE AGENT)

The user will run these steps themselves after the agent finishes. The agent must NOT perform any of them.

The user will:
1. Open `.env.local`, replace `PASTE_YOUR_GROQ_KEY_HERE` with a real Groq key from https://console.groq.com/keys (and add a Gemini key later for Prompt 3).
2. Save `.env.local` and run `npm run dev`.
3. Open `http://localhost:3000` and walk through the steps below.

User-side checks:
1. `npm run dev` opens `http://localhost:3000` without errors.
2. The landing page shows TWO textareas + an "Analyze with AI" button (disabled until both have 50+ characters).
3. Paste a real resume into the left textarea, a real job description into the right textarea.
4. Click "Analyze with AI". A spinner shows for 20–35 seconds (the LLM does more work — parsing the full resume AND tailoring it).
5. The results page appears with:
   - A score widget showing Original X/100 → Tailored Y/100 with the AI's explanation.
   - A JD summary card with job title, company, and skill chips.
   - 4–6 tailored bullet cards (each showing original vs tailored + change reason + confidence badge).
   - A "Gaps to Address" panel with importance dots.
   - A "Download Tailored Resume PDF" button at the bottom.
6. Click "Download Tailored Resume PDF". A `Tailored_Resume.pdf` downloads and opens cleanly. The PDF should look like a real resume:
   - **Centered name** in large bold caps at the top
   - **Centered location** below the name
   - **Centered "phone | email"** contact line
   - **Profile** section heading with horizontal underline, followed by a tailored 2-4 sentence summary
   - **Education** section with institution bold on left, dates bold on right, degree and location in italic
   - **Projects** section with each project showing "**Name:** | *Tech Stack*" then indented bullets
   - **Technical Skills** section with each row as "**Category** : item, item, item"
   - **Courses and Certifications** section with bulleted list
   - **Declaration** section with the standard declaration sentence
7. Close the browser tab. Reopen `http://localhost:3000`. The results are still there (localStorage persistence works). No new API call is made.
8. Click "Start Over". Returns to the input state with empty textareas.

If all 8 checks pass, Prompt 1 is complete. The user then runs Prompt 2 (Recruiter Lens Agent for cover letter + cold email).

---

## 🛑 FINAL STOP INSTRUCTION FOR THE AGENT

After you create all the files in this prompt and successfully run `npm install` ONCE in the current directory, your work is done.

You must NOT:
- Open a browser, navigate to any URL, or use Playwright / Puppeteer / Chrome MCP.
- Run `npm run dev`, `npm run build`, `npm run start`, `npx next`, `npx tsc`, `npm run lint`, or any verification command.
- Make HTTP/fetch/curl requests to `localhost`, `127.0.0.1`, or anywhere else.
- Take screenshots. Spawn background processes. Monitor logs. Watch terminals.
- Loop to "fix" or "verify" anything. The verification checklist above is for the USER to run manually — not you.
- Read, list, or grep any directory outside the current one.
- Touch `.env.local` after you create it with the placeholder values. The user fills in real keys.

Output one short final message such as `"Done. All Prompt 1 files created and dependencies installed. The user can now paste their Groq key into .env.local and run npm run dev."` Then end your turn. That is all.
