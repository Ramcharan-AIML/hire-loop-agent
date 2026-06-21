"use client";

import React, { useState, useRef } from "react";
import { Upload, File, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  onClear: () => void;
  selectedFile: File | null;
  isLoading?: boolean;
  error?: string | null;
  acceptedTypes?: string[];
  maxSizeMB?: number;
}

export default function FileUploader({
  onFileSelect,
  onClear,
  selectedFile,
  isLoading = false,
  error = null,
  acceptedTypes = [".pdf", ".docx"],
  maxSizeMB = 5,
}: FileUploaderProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const displayError = clientError || error;

  const validateFile = (file: File): boolean => {
    setClientError(null);

    // Validate type by extension
    const extension = "." + file.name.split(".").pop()?.toLowerCase();
    if (!acceptedTypes.includes(extension)) {
      setClientError(`Unsupported file format. Please upload ${acceptedTypes.join(" or ")}.`);
      return false;
    }

    // Validate size (5MB max)
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      setClientError(`File is too large. Maximum size is ${maxSizeMB}MB.`);
      return false;
    }

    return true;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (isLoading) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        onFileSelect(file);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        onFileSelect(file);
      }
    }
  };

  const onDragButtonClick = () => {
    if (isLoading) return;
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(",")}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={isLoading}
      />

      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={selectedFile ? undefined : onDragButtonClick}
        className={cn(
          "relative min-h-[180px] rounded-2xl flex flex-col items-center justify-center border-2 border-dashed transition-all duration-300 p-6 glass-panel cursor-pointer",
          selectedFile ? "border-success/30 bg-success/5" : "border-slate-200 hover:border-accent-primary/40 hover:bg-slate-50/50",
          isDragActive && "border-accent-secondary/60 bg-accent-secondary/5 scale-[1.01] ring-2 ring-accent-secondary/20 shadow-sm",
          isLoading && "opacity-60 cursor-not-allowed pointer-events-none"
        )}
      >
        {selectedFile ? (
          // File selected display
          <div className="flex flex-col items-center gap-3 text-center w-full max-w-sm animate-fade-in-up">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center text-success border border-success/20">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="flex flex-col gap-0.5 max-w-full">
              <span className="text-sm font-semibold truncate text-text-primary">
                {selectedFile.name}
              </span>
              <span className="text-xs text-text-muted">
                {formatFileSize(selectedFile.size)}
              </span>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setClientError(null);
                onClear();
              }}
              className="mt-2 text-xs font-semibold text-danger flex items-center gap-1 hover:brightness-110 p-1.5 hover:bg-slate-100 rounded-lg transition-all"
            >
              <X className="w-3.5 h-3.5" />
              Remove File
            </button>
          </div>
        ) : (
          // Empty upload area
          <div className="flex flex-col items-center gap-3 text-center select-none">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-text-muted border border-slate-200/80 group-hover:scale-110 transition-transform duration-300">
              <Upload className="w-5 h-5 text-accent-primary" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-text-primary">
                Drag and drop your file here, or{" "}
                <span className="text-accent-secondary underline underline-offset-2">browse</span>
              </p>
              <p className="text-xs text-text-muted">
                Supports PDF and Word (DOCX) formats up to {maxSizeMB}MB
              </p>
            </div>
          </div>
        )}

        {/* Dragoverlay cover indicator */}
        {isDragActive && (
          <div className="absolute inset-0 bg-white/90 rounded-2xl flex items-center justify-center pointer-events-none z-10">
            <span className="text-sm font-bold text-accent-secondary tracking-wide uppercase">
              Drop file here!
            </span>
          </div>
        )}
      </div>

      {/* Error message */}
      {displayError && (
        <div className="flex items-start gap-2 text-xs text-danger font-semibold bg-danger/10 border border-danger/20 rounded-xl p-3 animate-fade-in-up">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{displayError}</span>
        </div>
      )}
    </div>
  );
}
