"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase } from "lucide-react";
import TextareaWithCounter from "./TextareaWithCounter";

interface JDInputProps {
  value: string;
  onChange: (text: string) => void;
  isLoading?: boolean;
}

export default function JDInput({ value, onChange, isLoading = false }: JDInputProps) {
  return (
    <Card className="glass-panel shadow-sm hover:shadow-md transition-all h-full flex flex-col">
      <CardHeader className="pb-3 shrink-0">
        <CardTitle className="text-xl font-bold flex items-center gap-2 text-text-primary">
          <Briefcase className="h-5 w-5 text-accent-secondary" />
          Job Description
        </CardTitle>
        <CardDescription className="text-text-muted">
          Paste the target job description details including requirements, skills, and responsibilities.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        <TextareaWithCounter
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Paste the target job description here...\n\nExample:\nWe are seeking a Senior Frontend Engineer with 5+ years of experience in React, Next.js, and TypeScript. You will be responsible for building responsive UI interfaces, optimizing web core vitals, and collaborating with design teams.`}
          maxChars={8000}
          warnChars={6000}
          className="flex-1 h-full min-h-[220px]"
          disabled={isLoading}
        />
      </CardContent>
    </Card>
  );
}
