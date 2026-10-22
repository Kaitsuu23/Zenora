"use client";

import React from "react";
import { Server } from "lucide-react";
import type { StreamServerItem } from "@/types/api";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ServerSelectorProps {
  servers: StreamServerItem[];
  selectedServer: string | null;
  onSelectServer: (server: string) => void;
  isLoading?: boolean;
}

export function ServerSelector({
  servers,
  selectedServer,
  onSelectServer,
  isLoading = false,
}: ServerSelectorProps) {
  if (!servers || servers.length === 0) return null;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex flex-col gap-2 border-t border-b border-white/10 py-3 my-4">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-neutral-400">
          <Server className="h-3.5 w-3.5" />
          <span>Pilih Server Streaming:</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
          {servers.map((srv) => {
            const isSelected = selectedServer?.toLowerCase() === srv.server.toLowerCase();

            return (
              <Tooltip key={srv.server}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => onSelectServer(srv.server)}
                    className={`shrink-0 flex items-center gap-1.5 border px-3 py-2.5 min-h-[44px] text-xs font-mono uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? "border-white bg-white text-black font-bold shadow-sm"
                        : srv.canExtract
                        ? "border-white/20 bg-neutral-950 text-neutral-300 hover:border-white hover:text-white"
                        : "border-white/10 bg-neutral-950 text-neutral-500 hover:border-white/30 hover:text-neutral-300"
                    } ${isLoading ? "opacity-60 cursor-wait" : ""}`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isSelected ? "bg-black" : srv.canExtract ? "bg-neutral-500" : "bg-neutral-700"
                      }`}
                    />
                    <span>{srv.server}</span>
                  </button>
                </TooltipTrigger>
                {!srv.canExtract && (
                  <TooltipContent>
                    <span>Diputar via iframe embed</span>
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
