import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { TailoringRun } from "@/lib/schemas/tailoring-run";
import { JobRecord, EmailDraft, LogEntry } from "@/lib/schemas/platform";
import { sampleResumeText } from "@/lib/demo/sample-resume";
import { sampleJDText } from "@/lib/demo/sample-jd";

interface TailoringState {
  resumeText: string;
  jdText: string;
  extractedResumePreview: string;
  runData: TailoringRun | null;
  confirmedBullets: Record<string, boolean>; // key format: exp_{idx}_bullet_{idx} or proj_{idx}_bullet_{idx}

  // Platform pipeline state (Discover -> Tailor -> Outreach -> Done)
  selectedJob: JobRecord | null;
  recipientEmail: string;
  recipientName: string;
  emailDraft: EmailDraft | null;
  sentLog: LogEntry | null;

  // Setters
  setResumeText: (text: string) => void;
  setJDText: (text: string) => void;
  setExtractedResumePreview: (text: string) => void;
  setRunData: (run: TailoringRun | null) => void;
  setBulletConfirmed: (key: string, confirmed: boolean) => void;
  confirmAllBullets: (keys: string[]) => void;

  // Platform setters
  setSelectedJob: (job: JobRecord | null) => void;
  setRecipientEmail: (email: string) => void;
  setRecipientName: (name: string) => void;
  setEmailDraft: (draft: EmailDraft | null) => void;
  setSentLog: (log: LogEntry | null) => void;

  // Cleaners
  resetRun: () => void;
  loadDemoData: () => void;
}

// Generate a random tab session ID on first load to prevent any cache contamination
const getTabSessionId = () => {
  if (typeof window === "undefined") return "server";
  let id = window.name;
  if (!id) {
    id = `tab_${Math.random().toString(36).substring(2, 11)}`;
    window.name = id; // Window name persists across page refreshes in the same tab
  }
  return id;
};

const storageKey = `resume-shapeshifter-store-${getTabSessionId()}`;

export const useTailoringStore = create<TailoringState>()(
  persist(
    (set) => ({
      resumeText: "",
      jdText: "",
      extractedResumePreview: "",
      runData: null,
      confirmedBullets: {},

      selectedJob: null,
      recipientEmail: "",
      recipientName: "",
      emailDraft: null,
      sentLog: null,

      setSelectedJob: (job) => set({ selectedJob: job }),
      setRecipientEmail: (email) => set({ recipientEmail: email }),
      setRecipientName: (name) => set({ recipientName: name }),
      setEmailDraft: (draft) => set({ emailDraft: draft }),
      setSentLog: (log) => set({ sentLog: log }),

      setResumeText: (text) => set({ resumeText: text }),
      setJDText: (text) => set({ jdText: text }),
      setExtractedResumePreview: (text) => set({ extractedResumePreview: text }),
      setRunData: (run) => set({ runData: run, confirmedBullets: {} }), // Reset confirmations on new run
      setBulletConfirmed: (key, confirmed) =>
        set((state) => ({
          confirmedBullets: {
            ...state.confirmedBullets,
            [key]: confirmed,
          },
        })),
      confirmAllBullets: (keys) =>
        set((state) => {
          const newConfirmed = { ...state.confirmedBullets };
          keys.forEach((key) => {
            newConfirmed[key] = true;
          });
          return { confirmedBullets: newConfirmed };
        }),

      resetRun: () =>
        set({
          resumeText: "",
          jdText: "",
          extractedResumePreview: "",
          runData: null,
          confirmedBullets: {},
          selectedJob: null,
          recipientEmail: "",
          recipientName: "",
          emailDraft: null,
          sentLog: null,
        }),

      loadDemoData: () =>
        set({
          resumeText: sampleResumeText,
          jdText: sampleJDText,
          extractedResumePreview: "",
          runData: null,
          confirmedBullets: {},
        }),
    }),
    {
      name: storageKey,
      storage: createJSONStorage(() => {
        if (typeof window !== "undefined") {
          return window.sessionStorage;
        }
        // Fallback for SSR/Server environments
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
    }
  )
);
