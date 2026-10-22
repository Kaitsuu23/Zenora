import React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFriendlyErrorMessage } from "@/lib/api";

interface ErrorStateProps {
  title?: string;
  message?: string;
  code?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Gagal Memuat Konten",
  message,
  code,
  onRetry,
  className = "",
}: ErrorStateProps) {
  const displayMessage = message || getFriendlyErrorMessage(code);

  return (
    <div
      className={`border border-white/10 bg-neutral-950/60 p-8 md:p-12 text-center max-w-lg mx-auto my-8 ${className}`}
    >
      <div className="inline-flex h-10 w-10 items-center justify-center border border-white/20 bg-neutral-900 mb-4 text-white">
        <AlertCircle className="h-5 w-5" />
      </div>
      <h3 className="font-mono text-sm tracking-wider uppercase text-white font-medium mb-1">
        {title}
      </h3>
      {code && (
        <span className="inline-block font-mono text-[10px] text-neutral-500 tracking-widest uppercase mb-3">
          Error: {code}
        </span>
      )}
      <p className="text-xs text-neutral-400 mb-6 font-mono leading-relaxed max-w-sm mx-auto">
        {displayMessage}
      </p>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          size="sm"
          className="gap-2 border-white/30 hover:border-white"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Coba Lagi</span>
        </Button>
      )}
    </div>
  );
}
