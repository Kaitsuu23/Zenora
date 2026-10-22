import React from "react";
import Link from "next/link";
import Image from "next/image";
import type { GenreListItem } from "@/types/api";
import { Film } from "lucide-react";

interface GenreCardProps {
  genre: GenreListItem;
}

export function GenreCard({ genre }: GenreCardProps) {
  const isJavhdDomain =
    genre.thumbnail?.includes("pics.javhd.today") ||
    genre.thumbnail?.includes("cdn10.javtop.fun");

  return (
    <Link
      href={`/genres/${genre.slug}`}
      className="group relative flex flex-col overflow-hidden border border-white/10 bg-neutral-950 p-4 transition-all duration-300 hover:border-white/40 hover:bg-neutral-900/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-900 mb-3 border border-white/5">
        {genre.thumbnail ? (
          <Image
            src={genre.thumbnail}
            alt={genre.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            unoptimized={!isJavhdDomain}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-neutral-950 text-neutral-600">
            <Film className="h-6 w-6" />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <h3 className="font-mono text-xs uppercase tracking-wider text-neutral-200 group-hover:text-white transition-colors truncate">
          {genre.name}
        </h3>
        <span className="font-mono text-[10px] tracking-widest text-neutral-400 bg-neutral-900 border border-white/10 px-1.5 py-0.5 whitespace-nowrap">
          {genre.videoCount?.toLocaleString() || 0}
        </span>
      </div>
    </Link>
  );
}
