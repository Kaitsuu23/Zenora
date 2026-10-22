"use client";

import React from "react";

interface LoadingCenterProps {
  label?: string;
}

export function LoadingCenter({ label = "Memuat Data..." }: LoadingCenterProps) {
  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center gap-4 py-16 select-none animate-in fade-in duration-200">
      <style>{`
        @keyframes jvBarBounce {
          0%, 100% { height: 8px; opacity: 0.25; }
          50% { height: 32px; opacity: 1; }
        }
      `}</style>

      {/* Equalizer 4-Bar Animation */}
      <div className="flex items-center gap-1.5 h-9">
        <div
          className="w-1.5 bg-white"
          style={{ animation: "jvBarBounce 0.9s ease-in-out infinite" }}
        />
        <div
          className="w-1.5 bg-white"
          style={{ animation: "jvBarBounce 0.9s ease-in-out infinite 0.15s" }}
        />
        <div
          className="w-1.5 bg-white"
          style={{ animation: "jvBarBounce 0.9s ease-in-out infinite 0.3s" }}
        />
        <div
          className="w-1.5 bg-white"
          style={{ animation: "jvBarBounce 0.9s ease-in-out infinite 0.45s" }}
        />
      </div>

      {/* Typography Label */}
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="font-mono text-xs tracking-widest uppercase text-white font-bold">
          {label}
        </span>
        <span className="font-mono text-[9px] tracking-widest uppercase text-neutral-500">
          ZENORA STREAM
        </span>
      </div>
    </div>
  );
}
