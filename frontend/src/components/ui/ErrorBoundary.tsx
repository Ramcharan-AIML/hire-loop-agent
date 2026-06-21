"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./button";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught boundary error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none py-16 animate-fade-in-up">
          <div className="glass-panel border border-red-200/80 p-8 rounded-2xl max-w-md w-full bg-white shadow-sm flex flex-col items-center gap-5">
            {/* Red Alert Icon */}
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center border border-red-100 text-red-600">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>

            {/* Error Message */}
            <div className="flex flex-col gap-1.5">
              <h3 className="text-base font-bold text-text-primary">
                A system crash occurred
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">
                The interface encountered an unexpected runtime error:
              </p>
              {this.state.error && (
                <code className="text-[10px] text-red-800 bg-red-50/50 border border-red-100 rounded-lg p-2.5 font-mono text-left block max-h-24 overflow-y-auto mt-2 leading-relaxed select-all">
                  {this.state.error.message || "Unknown runtime exception"}
                </code>
              )}
            </div>

            {/* Control Actions */}
            <Button
              onClick={this.handleReset}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl h-11 gap-1.5 cursor-pointer shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Application
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
