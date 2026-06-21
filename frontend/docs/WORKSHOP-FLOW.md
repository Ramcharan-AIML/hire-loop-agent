# 🎤 Workshop Flow — Ram's Speaker Guide

**Total time: 90 minutes** · **Format: Live group build with one screen-share volunteer + everyone follows along** · **Audience: 50 participants**

This is your full speaker guide — opening speech, minute-by-minute flow, talking points for the "AI is building" wait times, troubleshooting one-liners, and closing with the Bonus Pack reveal.

---

## 🎬 OPENING — Minutes 0:00 to 0:05 (HIGH ENERGY)

### Your opening speech (memorize the flow, not the words)

> *"Hello everyone, welcome! I'm Ram, your instructor for the next 90 minutes."*
>
> *"Quick story before we start — three weeks ago, a friend told me he spent 4 hours tailoring his resume for ONE job application. Four hours. Then he wrote a cover letter. Then he practiced for the interview. He did all of this for ONE job. And he didn't even get a reply."*
>
> *"In the next 90 minutes, we're going to build the AI version of all of that. A real app, running on your laptop, that tailors your resume in 30 seconds, writes your cover letter in 15 seconds, AND interviews you to see if you're ready. All free. All built by you. And — here's the part I love — it's powered by two REAL AI agents. Not ChatGPT wrappers. Real agents with tool calling."*
>
> *"Now I'm going to do something most workshops don't do — I'm going to STOP TALKING and let YOU build. We're going to do this together. So let me ask:"*

**→ Ask out loud + chat poll:**
> *"How many of you completed the prerequisites? Type a 1 in chat if yes, type a 2 if you still need help with something."*

Wait 30 seconds. Address the 2s briefly. If many people say 2, run through the prerequisites doc with screen-share for 2 minutes.

### Drop the HOOK (this is critical for retention)

> *"One more thing before we start. I've prepared a BONUS PACK for everyone who's still here at the 90-minute mark. It's worth keeping you on for. It includes a bonus 4th agent you can add to your project tonight, a list of 30 next AI agent projects you can build, a LinkedIn post template, and templates for putting this project on your resume."*
>
> *"I will share the link AT THE END. Not before. So stay till the end."*

### Set up the volunteer flow

> *"Now here's how we're going to build this. I need ONE volunteer to share their screen. Just ONE. That person will run the prompts in their editor, and everyone else builds along on their own laptop. If you run into a problem, drop it in chat — we'll handle it together."*
>
> *"Volunteering is the fastest way to learn this. Who's brave? Drop a 'me' in chat."*

**→ Pick ONE volunteer.** If nobody volunteers in 60 seconds:
> *"No worries — I'll share my screen, and we'll all build together."*

Either way: **everyone builds along in their own folder.** The screen-share is just to anchor the pace.

---

## 🟪 PROMPT 1 — Minutes 0:05 to 0:30 (25 minutes)

### Setup speech (0:05–0:08)

> *"OK — everyone, create a new empty folder on your desktop. Call it `resume-shapeshifter`. Open it in Cursor or Antigravity. Open the Agent panel — in Cursor that's Cmd+I (or Ctrl+I on Windows), in Antigravity it's the agent icon on the right sidebar."*
>
> *"Important: enable AUTO-ACCEPT for file changes. We're trusting the agent to write everything correctly. You don't want to click 'accept' 50 times."*

Show the agent panel + auto-accept toggle on the volunteer's screen.

### Open the prompt file (0:08–0:10)

> *"Open the link I just dropped in chat for Prompt 1. Copy the entire thing. Don't try to read it — just copy it all and paste it into your Agent panel. Press Enter."*

**→ Drop the GitHub raw link to prompt-1.md in chat.**

Wait for everyone to paste it. Confirm: *"Show me a 'go' in chat once you've pasted Prompt 1."*

### THE WAIT — Prompt 1 runs (0:10–0:25, about 15 minutes of agent work)

This is your TEACHING window. The agent is silently writing ~17 files. Use this time to explain the building blocks. Pick 3-4 of these mini-lessons:

#### Mini-lesson 1 — "What is Groq?" (2 min)
> *"Groq is a chip company. They built custom hardware that runs Llama models 5-10x faster than the GPUs everyone else uses. That's why our responses come back in 2 seconds instead of 20. Free tier is super generous — 14,400 requests a day per key, which is more than your workshop will ever need."*

#### Mini-lesson 2 — "What is a Zod schema?" (2 min)
> *"The agent is writing what's called Zod schemas right now. Zod is a tool that says 'I expect data in EXACTLY this shape — if the AI returns something different, throw an error.' This is huge — without Zod, when the AI hallucinates and returns broken JSON, your app crashes. With Zod, you retry. We use Zod everywhere. That's why this app is rock-solid."*

#### Mini-lesson 3 — "Why a TAILORED resume, not a generic one?" (2 min)
> *"Recruiters spend ~7 seconds on a resume. If yours doesn't match the job keywords, you're out. Tools like Resume Worded charge $30/month for this. We're building the same thing in 90 minutes, for $0. You can use this for every job application from now on."*

#### Mini-lesson 4 — "How does the agent know your resume's NAME, EMAIL, education?" (2 min)
> *"We're not asking the AI for just a list of bullets. We're asking it to PARSE the resume into structured data — name, contact info, education, projects, skills. Then it tailors the relevant parts and gives us back a complete structured resume. That's why our PDF looks like a real resume, not a bullet list."*

### Watch the build complete (0:25–0:27)

When the agent finishes:
> *"Beautiful. Now everyone, do these 3 things:"*
> 1. *"Open `.env.local` in your project — it's at the root."*
> 2. *"Paste your Groq API key where it says `PASTE_YOUR_GROQ_KEY_HERE`. Save."*
> 3. *"In your terminal, run `npm run dev`."*

### First WOW moment (0:27–0:30)

> *"Open `http://localhost:3000` in your browser. Paste your resume on the left. Paste the job description on the right. Click Analyze."*

Wait ~25 seconds. Then:
> *"DID YOU SEE THAT? Look at your screen. That's YOUR resume, rewritten for THIS job, in 25 seconds. Look at the score — original 52, tailored 88. That's the magic. Click Download PDF — that's a real, formatted, professional resume PDF, ready to send."*

**→ Pause for chat reactions. This is the first dopamine moment.**

---

## 🟦 PROMPT 2 — Minutes 0:30 to 0:55 (25 minutes)

### Setup speech (0:30–0:33)

> *"OK that was AI doing one task. Now we're going to build a REAL AGENT. Not a single LLM call — an actual agent that thinks, takes action, checks its work, and corrects itself if it messes up."*
>
> *"It's going to write a cover letter and a cold email for you. Then it's going to put on a RECRUITER LENS — basically simulate a recruiter reading 200 resumes a day — and catch every AI-tell phrase that would make them hit 'skip'. Things like 'I am writing to express my interest' — recruiters auto-reject those. The agent finds them and rewrites."*
>
> *"This is what AGENTS do. They use tools. They check their own work. They iterate."*
>
> *"Drop your Prompt 2 link in chat. Paste it. Hit Enter."*

**→ Drop the link to prompt-2.md.**

### THE WAIT — Prompt 2 runs (0:33–0:48, about 15 minutes)

#### Mini-lesson 1 — "What makes something a REAL agent?" (3 min)
> *"An agent has 4 things — goal, tools, decisions, iteration. ChatGPT in a web page is NOT an agent — it just generates text. An agent CALLS TOOLS. Like, it might call a 'check_quality' tool, see the result, and decide 'I need to rewrite'. That's what we're building. The agent uses 2 tools — `draft_application_kit` (writes the letter) and our quality checker (catches AI-tells). It iterates if it needs to."*

#### Mini-lesson 2 — "What ARE AI-tells exactly?" (2 min)
> *"Phrases that scream 'an AI wrote this'. 'Leverage', 'synergy', 'moreover', 'furthermore', 'I am thrilled to apply'. Recruiters are getting trained to spot these. If they see them, they hit reject. Our agent has a list of 25 forbidden phrases. It checks every draft and rewrites if it finds them. That's a REAL agent doing REAL work."*

#### Mini-lesson 3 — "How does the agent KNOW the JD's company name?" (2 min)
> *"The recruiter-lens checker also enforces: the cover letter must mention the company name at least twice. The cold email must mention it once. If it doesn't, the agent rewrites. That's how we force PERSONALIZATION."*

### Build completes — Second WOW moment (0:48–0:55)

> *"Click 'Generate Application Kit'. Watch the agent work LIVE. See those warning items? Each one is the recruiter lens catching something the AI tried to slip in. Now watch — it rewrites, checks again, and passes. THAT is an agent."*
>
> *"Click 'Copy to clipboard' on the cover letter. You can paste that into your email RIGHT NOW. Click on the cold email — same thing. These are real, send-ready, recruiter-proof messages."*

**→ Pause for reactions. Second dopamine moment.**

---

## 🟩 PROMPT 3 — Minutes 0:55 to 1:20 (25 minutes)

### Setup speech (0:55–0:58)

> *"Last agent. This one is going to MOCK INTERVIEW you. It reads your resume, asks 5 questions ONLY about things you've actually done, evaluates each answer, and at the end gives you a verdict: 'Ready' or 'Needs Practice.'"*
>
> *"This is the most fun part. You get to actually talk to your AI interviewer."*
>
> *"Drop the Prompt 3 link in chat. Paste it. Hit Enter."*

**→ Drop the link to prompt-3.md.**

### THE WAIT — Prompt 3 runs (0:58–1:13, about 15 minutes)

#### Mini-lesson 1 — "How does the agent stay grounded in your resume?" (3 min)
> *"This is the safety check. The system prompt SHOUTS at the AI: 'You may ONLY ask about things in this resume.' If your resume doesn't say Kubernetes, the agent CAN'T ask about Kubernetes. It's not a polite request — it's a hard rule. This is how we prevent the AI from going off the rails."*

#### Mini-lesson 2 — "What's a 'forced tool call'?" (3 min)
> *"After question 5, we don't TRUST the agent to remember it should stop. We FORCE it. There's a special config — `tool_choice: { name: 'submit_final_assessment' }` — that means 'you have ONE option: call this tool. No more questions.' That's how we guarantee the agent doesn't ramble forever."*

#### Mini-lesson 3 — "Why TOOL CALLING is a big deal" (2 min)
> *"Tool calling is the ONLY way to get reliable structured output from an LLM. We tell the agent: 'When you're ready to evaluate, call `submit_final_assessment` with these exact fields.' The agent fills in those fields. We validate them with Zod. If wrong, we retry. THIS is the pattern every production AI app uses."*

### Build completes — Third WOW moment (1:13–1:20)

> *"Click 'Take Mock Interview' on your results page. The agent reads your resume, your JD, and starts the interview. Type real answers — not 'idk', actually try."*

Walk one person (volunteer) through the interview live on screen. Have them answer all 5 questions. Show the final assessment card with verdict.

> *"Look at this — Score: 78/100. Verdict: Ready. Strengths: clear technical depth on the React projects. Areas to improve: practice quantifying outcomes. THIS is a real interview prep tool. You can run this every day until you actually nail the job."*

**→ Third dopamine moment.**

---

## 🎁 CLOSING — Minutes 1:20 to 1:30 (10 minutes — THE BONUS REVEAL)

### Wrap & celebrate (1:20–1:22)

> *"Look at what you just built. A real AI resume tailor. A real AI cover letter writer with a recruiter lens. A real AI mock interviewer. Three real things. Two real agents. Ninety minutes. Free forever. On YOUR laptop."*
>
> *"This is a portfolio project. This is a resume bullet. This is something you can show in your next interview."*

### The Bonus Pack reveal (1:22–1:27)

> *"And as promised — for everyone who stayed till the end — here's your Bonus Pack."*

**→ Drop the link to WORKSHOP-BONUS-PACK.md in chat.**

> *"In there you'll find:"*
> - *"A BONUS 4th agent prompt — adds a Voice Mock Interview to your project. Yes, voice. You'll be talking to your interviewer out loud."*
> - *"30 AI agent project ideas you can build next, ranked by difficulty."*
> - *"A LinkedIn post template — copy, paste, share your project. Tag me if you want — I love seeing your work."*
> - *"Resume bullet templates — exactly how to put this project on your resume."*
>
> *"This is yours. Use it. Build more agents. Share what you build."*

### Q&A + farewell (1:27–1:30)

> *"What questions do you have? I'll take 3 minutes."*

Answer 2-3 questions max. Then:

> *"Thank you all for being here. Go build something cool. See you next time. 🎤"*

---

## 🚨 Troubleshooting one-liners (keep open on a second screen)

| Symptom in chat | Your one-liner reply |
|---|---|
| "npm run dev says port 3000 in use" | `Run npx next dev -p 3001 instead` |
| "Groq returned 401" | `Re-paste your key in .env.local, save, restart npm run dev` |
| "Groq returned 429" | `Free tier hit a burst — wait 30 seconds, retry` |
| "Banner says add Groq key even after I pasted it" | `You need to RESTART npm run dev after editing .env.local — Ctrl+C, then npm run dev again` |
| "TypeScript errors after Prompt 2" | `Click Start Over to clear localStorage — old schema is cached` |
| "Agent stopped halfway through Prompt 1" | `Type 'continue' in the Agent panel and hit Enter` |
| "Mock Interview asks about something not in my resume" | `It shouldn't — share a screenshot, I'll check the prompt` |
| "I can't volunteer because my screen is messy" | `That's fine — I'll share. You all follow along.` |

---

## 📋 30-minute pre-show checklist (do this 30 min before workshop)

- [ ] Test the join link
- [ ] Mute notifications on your laptop
- [ ] Have prompt-1, prompt-2, prompt-3 links copied to a Notepad — drop them at the right times
- [ ] Have WORKSHOP-PREREQUISITES.md link ready (in case stragglers ask)
- [ ] Have WORKSHOP-BONUS-PACK.md link ready (drop at minute 82)
- [ ] Open a fresh empty folder in Cursor — your fallback if no one volunteers
- [ ] Have a sample resume + sample JD ready (to demo if needed)
- [ ] Energy drink / coffee within reach
- [ ] Close all other apps to save laptop CPU

---

## 🎯 The 5 things you must do well

1. **Open with energy.** Smile. Be excited. The first 60 seconds set the entire workshop's mood.
2. **Drop the BONUS PACK hook early.** Don't reveal what's in it — just say "it's worth it". Curiosity holds them.
3. **Get a volunteer.** Or be prepared to share your own screen confidently.
4. **Use the wait time wisely.** The 3 prompt-building sessions are ~15 min each — that's 45 minutes of teaching opportunity baked in.
5. **End on time.** The whole magic of a 90-minute workshop is that you respect their time. End at 90:00, not 95:00.

---

You're going to crush this. Build it once with the prompts in a fresh folder this week so you've done it cold yourself. Then on workshop day, just be Ram. The prompts do the work. 🎤
