"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { PeriodSelect } from "@/components/filters/period-select";
import { BROWSE_TYPES } from "@/lib/constants";

interface BrowseHeaderProps {
  currentType: string;
  currentPeriod: string;
}

/**
 * Builds clean path-based browse URL:
 *   /browse/recent
 *   /browse/popular
 *   /browse/popular/this-year
 */
function buildBrowseUrl(type: string, period?: string): string {
  if (type === "recent" || !period || period === "all-time") {
    return `/browse/${type}`;
  }
  return `/browse/${type}/${period}`;
}

export function BrowseHeader({ currentType, currentPeriod }: BrowseHeaderProps) {
  const router = useRouter();

  const handleTypeChange = (newType: string) => {
    // When switching browse type, reset period to default (all-time)
    router.push(buildBrowseUrl(newType, "all-time"));
  };

  const handlePeriodChange = (newPeriod: string) => {
    router.push(buildBrowseUrl(currentType, newPeriod));
  };

  const isRecent = currentType === "recent";

  return (
    <div className="flex flex-col gap-4 border-b border-white/10 pb-4 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Type Tabs */}
        <div className="flex items-center overflow-x-auto border-b sm:border-b-0 border-white/10 pb-2 sm:pb-0 gap-1 no-scrollbar">
          {BROWSE_TYPES.map((item) => {
            const isActive = currentType === item.type;
            return (
              <button
                key={item.type}
                type="button"
                onClick={() => handleTypeChange(item.type)}
                className={`whitespace-nowrap px-3 py-2.5 min-h-[44px] text-xs font-mono uppercase tracking-wider transition-all cursor-pointer border ${
                  isActive
                    ? "border-white bg-white text-black font-bold shadow-sm"
                    : "border-transparent text-neutral-400 hover:text-white hover:border-white/20"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Period Selector (disabled if type is recent) */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <PeriodSelect
            value={currentPeriod}
            onChange={handlePeriodChange}
            disabled={isRecent}
          />
        </div>
      </div>
    </div>
  );
}
