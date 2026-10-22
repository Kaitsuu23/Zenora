import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { mapSeeAllToHref } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  count?: number;
  seeAll?: string;
  seeAllLabel?: string;
  className?: string;
}

export function SectionHeader({
  title,
  count,
  seeAll,
  seeAllLabel = "Lihat Semua",
  className = "",
}: SectionHeaderProps) {
  const href = seeAll ? mapSeeAllToHref(seeAll) : null;

  return (
    <div
      className={`flex items-end justify-between border-b border-white/10 pb-3 mb-5 ${className}`}
    >
      <div className="flex items-baseline gap-3">
        <h2 className="text-sm md:text-base font-normal tracking-wide text-white uppercase font-mono flex items-center gap-2">
          <span className="inline-block h-2 w-2 bg-white" />
          {title}
        </h2>
        {typeof count === "number" && (
          <span className="text-[11px] font-mono text-neutral-500 tracking-widest">
            ({count})
          </span>
        )}
      </div>

      {href && (
        <Link
          href={href}
          className="group inline-flex items-center gap-1.5 text-[11px] font-mono tracking-widest uppercase text-neutral-400 hover:text-white transition-colors"
        >
          <span>{seeAllLabel}</span>
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
