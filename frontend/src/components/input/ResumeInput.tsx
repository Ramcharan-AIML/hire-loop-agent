"use client";

import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ClipboardList, Eye } from "lucide-react";
import TextareaWithCounter from "./TextareaWithCounter";
import FileUploader from "./FileUploader";

interface ResumeInputProps {
  textValue: string;
  onTextChange: (text: string) => void;
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
  extractedPreview: string;
  onExtractedPreviewChange: (text: string) => void;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
  error: string | null;
  setError: (err: string | null) => void;
}

export default function ResumeInput({
  textValue,
  onTextChange,
  selectedFile,
  onFileSelect,
  extractedPreview,
  onExtractedPreviewChange,
  isLoading,
  setIsLoading,
  error,
  setError,
}: ResumeInputProps) {
  const [activeTab, setActiveTab] = useState<string>("paste");

  const handleFileSelect = async (file: File) => {
    onFileSelect(file);
    setIsLoading(true);
    setError(null);
    onExtractedPreviewChange("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/parse-resume", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        onExtractedPreviewChange(result.text);
      } else {
        onFileSelect(null);
        setError(result.error || "Failed to extract text from file.");
      }
    } catch (err: any) {
      onFileSelect(null);
      setError("An unexpected error occurred during file upload.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearFile = () => {
    onFileSelect(null);
    onExtractedPreviewChange("");
    setError(null);
  };

  return (
    <Card className="glass-panel shadow-sm hover:shadow-md transition-all h-full flex flex-col">
      <CardHeader className="pb-3 shrink-0">
        <CardTitle className="text-xl font-bold flex items-center gap-2 text-text-primary">
          <FileText className="h-5 w-5 text-accent-primary" />
          Ingest Resume
        </CardTitle>
        <CardDescription className="text-text-muted">
          Paste your professional resume text or upload an ATS-friendly PDF/DOCX file.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        <Tabs
          value={activeTab}
          onValueChange={(val) => {
            setActiveTab(val);
            setError(null);
          }}
          className="w-full flex-1 flex flex-col"
        >
          <TabsList className="grid w-full grid-cols-2 bg-slate-100/80 border border-slate-200 rounded-xl p-1 mb-4">
            <TabsTrigger
              value="paste"
              disabled={isLoading}
              className="rounded-lg data-[state=active]:bg-accent-primary data-[state=active]:text-white text-text-muted py-2 text-sm font-semibold transition-all duration-300 cursor-pointer"
            >
              <ClipboardList className="w-4 h-4 mr-1.5" />
              Paste Text
            </TabsTrigger>
            <TabsTrigger
              value="upload"
              disabled={isLoading}
              className="rounded-lg data-[state=active]:bg-accent-primary data-[state=active]:text-white text-text-muted py-2 text-sm font-semibold transition-all duration-300 cursor-pointer"
            >
              <FileText className="w-4 h-4 mr-1.5" />
              Upload File
            </TabsTrigger>
          </TabsList>

          {/* Paste tab content */}
          <TabsContent value="paste" className="flex-1 flex flex-col focus-visible:outline-none min-h-0">
            <TextareaWithCounter
              value={textValue}
              onChange={(e) => onTextChange(e.target.value)}
              placeholder="Paste your resume content here... Include your summary, skills, experience bullets, and education details."
              maxChars={10000}
              warnChars={8000}
              className="flex-1 h-full min-h-[220px]"
              disabled={isLoading}
            />
          </TabsContent>

          {/* Upload file tab content */}
          <TabsContent value="upload" className="flex-1 flex flex-col gap-4 focus-visible:outline-none min-h-0">
            <FileUploader
              onFileSelect={handleFileSelect}
              onClear={handleClearFile}
              selectedFile={selectedFile}
              isLoading={isLoading}
              error={error}
              maxSizeMB={5}
            />

            {/* Extracted preview area */}
            {extractedPreview && (
              <div className="flex-1 flex flex-col gap-2 min-h-0 animate-fade-in-up mt-2">
                <div className="flex items-center gap-1.5 text-xs text-accent-secondary font-bold uppercase tracking-wider">
                  <Eye className="w-3.5 h-3.5" />
                  Extracted Text Preview
                </div>
                <div className="flex-1 p-3 rounded-xl bg-slate-50 border border-slate-200 overflow-y-auto text-xs text-text-muted font-mono whitespace-pre-wrap leading-relaxed max-h-[180px] select-none">
                  {extractedPreview}
                </div>
                <span className="text-[10px] text-text-muted italic">
                  * Verify formatting above. Complex margins/tables might read slightly out of order, which is normal.
                </span>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
