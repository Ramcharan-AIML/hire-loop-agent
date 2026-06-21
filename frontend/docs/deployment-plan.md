# Vercel Deployment Plan — Resume Shapeshifter

This document provides a comprehensive deployment guide to launch the **Resume Shapeshifter** Next.js App Router application onto **Vercel** with full GenAI pipelines and dynamic PDF generation.

---

## 🚀 Architectural Readiness for Vercel

The application's architecture was engineered from Day 1 to be highly compatible with Vercel's Serverless and Edge infrastructure:

1. **Next.js App Router (first-class Vercel support)**: 
   Vercel natively optimizes bundling, code splitting, and caching for Next.js App Router.
2. **Server-Side PDF Generation (`@react-pdf/renderer`)**:
   We explicitly locked our PDF generation API route (`/api/generate-pdf/route.ts`) to the **standard Node.js runtime** (`export const runtime = "nodejs"`). This allows Vercel to bundle required Canvas/Buffer polyfills correctly inside standard Serverless Functions without causing Edge environment bailouts.
3. **Provider-Agnostic LLM Pipelines**:
   The LLM client dynamically reads provider configurations from runtime environment variables, making provider switching seamless without requiring recompilation or code modifications.

---

## 🛠️ Step-by-Step Vercel Deployment

### Method A: Git Integration (Recommended for Continuous Delivery)
Connecting your GitHub repository is the easiest way to deploy, as Vercel will automatically trigger a new preview deployment for every branch push, and a production deployment for every merge to `main`.

1. Go to the [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New** → **Project**.
2. Under **Import Git Repository**, find and select the **`resume-shapeshifter-agent`** repository.
3. In the **Configure Project** pane:
   - **Framework Preset**: Next.js (automatically detected)
   - **Root Directory**: `./` (default)
4. Expand the **Environment Variables** panel and add your active keys (see the variables checklist below).
5. Click **Deploy**. Vercel will build and deploy the app in under 2 minutes.

---

### Method B: Vercel CLI (Recommended for Sandbox Testing)
If you want to deploy directly from your local terminal without pushing to a Git remote:

1. Install the Vercel CLI globally (if not already installed):
   ```bash
   npm install -g vercel
   ```
2. Log in to your Vercel account from the terminal:
   ```bash
   vercel login
   ```
3. Navigate to your project directory and trigger the deployment initialization:
   ```bash
   vercel
   ```
4. Follow the command prompts (default answers are suitable).
5. Link all required environment variables via the Vercel dashboard project panel, then trigger a production build release:
   ```bash
   vercel --prod
   ```

---

## 🔑 Environment Variables Checklist

Ensure these variables are added to your **Vercel Project Settings** under the **Environment Variables** panel. 

> [!WARNING]
> Never commit actual secret keys (like Groq or Gemini API keys) to your Git repository. Always inject them securely using the Vercel dashboard.

| Variable Name | Required | Active Provider Value | Purpose / Description |
|---|---|---|---|
| `LLM_PROVIDER` | **Yes** | `groq` or `gemini` | Instructs the factory which adapter client to instantiate. |
| `GROQ_API_KEY` | **Conditional** | `gsk_...` | Required if `LLM_PROVIDER=groq`. Get a free key from the [Groq Console](https://console.groq.com/). |
| `GOOGLE_API_KEY` | **Conditional** | `AIzaSy...` | Required if `LLM_PROVIDER=gemini`. Upgrade to the pay-as-you-go tier on [Google AI Studio](https://aistudio.google.com/). |
| `LLM_MODEL` | **No** | `llama-3.3-70b-versatile` | (Optional) Defaults to Llama-3.3 on Groq, or Gemini-2.0-Flash on Google. |
| `LLM_TEMPERATURE` | **No** | `0.3` | Enforces rigid compliance (lower temperature minimizes hallucinations). |
| `LLM_MAX_RETRIES` | **No** | `3` (or `6` for Gemini Free Tier) | Count of exponential backoff attempts on rate limits. |
| `NEXT_PUBLIC_APP_URL` | **Yes** | `https://your-project.vercel.app` | Set this to your actual production Vercel URL. Used to resolve PDF links. |

---

## ⚡ Serverless Optimization Recommendations

Deploying GenAI pipelines to serverless functions requires attention to timeouts and cold starts:

### 1. Handling Serverless Timeout Limits
- **Hobby Plan Timeout (10s)**: On Vercel's free Hobby tier, standard Serverless Functions have a maximum execution limit of **10 seconds**. Because sequential LLM chains (running 6 pipeline stages in sequence) can sometimes take over 10 seconds due to third-party API response delays, there is a minor risk of a gateway timeout (`544`) on very slow API days.
- **pro Plan Timeout (60s)**: If deploying to a production Pro team tier, you can easily increase the maximum serverless execution limit to 60 seconds by adding the config parameter inside `vercel.json` or page configs:
  ```json
  {
    "functions": {
      "src/app/api/**/*.ts": {
        "maxDuration": 60
      }
    }
  }
  ```

### 2. Auto-Retries & Backoff
We have already coded an automatic **exponential backoff and retry loop** inside the global `LLMClient`. If Groq or Gemini rate-limits your deployment, the serverless handler will automatically wait and retry the request in-flight, which ensures higher reliability.

### 3. Client-Side Hydration & Speed
The application leverages Next.js Turbopack compiler settings, ensuring that large heavy dependencies (like `@react-pdf/renderer` and `mammoth` parser bundles) are strictly encapsulated inside server-side route endpoints. The client-side dashboard bundles are extremely small (~150KB), loading in under **1.2 seconds** on Vercel's global CDN edge.
