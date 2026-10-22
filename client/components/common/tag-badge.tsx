import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface TagBadgeProps {
  label: string;
  href: string;
  count?: number;
  variant?: "outline" | "secondary" | "default";
}

export function TagBadge({ label, href, count, variant = "outline" }: TagBadgeProps) {
  return (
    <Link href={href} className="inline-block focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white">
      <Badge
        variant={variant}
        className="font-mono text-xs uppercase tracking-wider py-1 px-2.5 transition-all hover:bg-white hover:text-black hover:border-white"
      >
        <span>{label}</span>
        {typeof count === "number" && (
          <span className="ml-1.5 opacity-60 text-[10px]">({count})</span>
        )}
      </Badge>
    </Link>
  );
}
