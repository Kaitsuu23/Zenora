import React from "react";
import Link from "next/link";
import { User, ChevronRight } from "lucide-react";
import type { PornstarListItem } from "@/types/api";

interface PornstarCardProps {
  pornstar: PornstarListItem;
}

export function PornstarCard({ pornstar }: PornstarCardProps) {
  return (
    <Link
      href={`/pornstar/${pornstar.slug}`}
      className="group flex items-center justify-between border border-white/10 bg-neutral-950 p-4 transition-all duration-200 hover:border-white/40 hover:bg-neutral-900/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-8 w-8 border border-white/20 bg-neutral-900 flex items-center justify-center shrink-0 text-neutral-400 group-hover:text-white group-hover:border-white transition-colors">
          <User className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h3 className="font-mono text-xs uppercase tracking-wider text-neutral-200 group-hover:text-white transition-colors truncate">
            {pornstar.name}
          </h3>
          <span className="font-mono text-[10px] tracking-widest text-neutral-500 uppercase">
            {pornstar.videoCount || 0} Video
          </span>
        </div>
      </div>

      <ChevronRight className="h-4 w-4 text-neutral-600 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
    </Link>
  );
}
