"use client";

import React from "react";
import { Ghost, RefreshCw, LayoutDashboard } from "lucide-react";
import { Button, Card } from "@/components/ui";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches render-time errors in the component subtree and shows a
 * friendly recovery UI instead of a blank white page.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[60vh] items-center justify-center p-6">
          <Card variant="elevated" className="w-full max-w-md p-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-status-error/10 text-status-error animate-float">
              <Ghost className="h-8 w-8" />
            </div>
            <h2 className="mb-2 text-lg font-bold text-text-primary">Something went sideways</h2>
            <p className="mb-6 text-sm text-text-secondary leading-relaxed">
              Don&apos;t worry — we&apos;ll get you back on track. Try refreshing this section, or head back to the dashboard.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                variant="primary"
                size="md"
                leftIcon={<RefreshCw className="h-4 w-4" />}
                onClick={this.handleReset}
              >
                Try again
              </Button>
              <Button
                variant="secondary"
                size="md"
                leftIcon={<LayoutDashboard className="h-4 w-4" />}
                onClick={() => {
                  window.location.href = "/dashboard";
                }}
              >
                Go to dashboard
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
