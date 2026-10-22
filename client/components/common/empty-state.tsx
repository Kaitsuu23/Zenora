import React from "react";
import { Film, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  title?: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}

export function EmptyState({
  title = "Tidak Ada Video",
  description = "Belum ada item yang ditemukan pada kategori atau filter ini.",
  backHref,
  backLabel = "Kembali ke Beranda",
}: EmptyStateProps) {
  return (
    <div className="border border-white/10 bg-neutral-950/40 p-12 text-center max-w-md mx-auto my-12">
      <div className="inline-flex h-12 w-12 items-center justify-center border border-white/20 bg-neutral-900 mb-4 text-neutral-400">
        <Film className="h-5 w-5" />
      </div>
      <h3 className="font-mono text-xs tracking-widest uppercase text-white font-medium mb-2">
        {title}
      </h3>
      <p className="text-xs text-neutral-400 font-mono mb-6 leading-relaxed">
        {description}
      </p>
      {backHref && (
        <Button asChild variant="outline" size="sm">
          <Link href={backHref} className="gap-2">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{backLabel}</span>
          </Link>
        </Button>
      )}
    </div>
  );
}
