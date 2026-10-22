"use client";

import React from "react";
import { Sliders } from "lucide-react";
import type { StreamSource } from "@/types/api";

interface QualitySelectorProps {
  streams: StreamSource[];
  currentQuality: string;
  onSelectQuality: (quality: string) => void;
}

export function QualitySelector({
  streams,
  currentQuality,
  onSelectQuality,
}: QualitySelectorProps) {
  // If only one stream or all are auto, hide selector
  if (!streams || streams.length <= 1) {
    return null;
  }

  // Sort streams: 1080p -> 720p -> 480p -> 360p -> auto
  const sorted = [...streams].sort((a, b) => {
    const parseQuality = (q: string) => {
      const num = parseInt(q.replace(/\D/g, ""), 10);
      return isNaN(num) ? 0 : num;
    };
    return parseQuality(b.quality) - parseQuality(a.quality);
  });

  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-1 text-[11px] font-mono text-neutral-400 uppercase tracking-widest">
        <Sliders className="h-3 w-3" />
        <span>Kualitas:</span>
      </span>
      <div className="flex items-center gap-1">
        {sorted.map((stream) => {
          const isSelected = stream.quality === currentQuality;
          return (
            <button
              key={`${stream.quality}-${stream.resolution || ""}`}
              type="button"
              onClick={() => onSelectQuality(stream.quality)}
              className={`border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider transition-colors cursor-pointer ${
                isSelected
                  ? "border-white bg-white text-black font-bold"
                  : "border-white/20 text-neutral-400 hover:text-white hover:border-white"
              }`}
            >
              {stream.quality}
            </button>
          );
        })}
      </div>
    </div>
  );
}
