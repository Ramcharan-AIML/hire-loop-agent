import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

// Display font for the brand/logo and headings — modern, geometric, techy.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "HireLoop — Discover, Tailor & Reach Out, in One Loop",
  description: "HireLoop unifies job discovery, AI resume tailoring, and personalized recruiter outreach into a single hire-ready pipeline.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="min-h-screen bg-bg-primary text-text-primary">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
