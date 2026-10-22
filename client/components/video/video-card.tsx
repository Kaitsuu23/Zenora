"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Clock, Play, Film } from "lucide-react";
import type { VideoItem } from "@/types/api";
import { parseVideoUrl } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface VideoCardProps {
  video: VideoItem;
  priority?: boolean;
}

export function VideoCard({ video, priority = false }: VideoCardProps) {
  const [imageError, setImageError] = useState(false);
  const { href } = parseVideoUrl(video.url);

  // Check if thumbnail is from a known domain or needs unoptimized fallback
  const isJavhdDomain =
    video.thumbnail?.includes("pics.javhd.today") ||
    video.thumbnail?.includes("cdn10.javtop.fun");

  return (
    <article className="group relative flex flex-col bg-neutral-950/60 border border-white/10 hover:border-white/30 transition-all duration-300">
      {/* Portrait DVD Cover (2:3 aspect ratio) */}
      <Link
        href={href}
        className="relative block aspect-[2/3] w-full overflow-hidden bg-neutral-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
        tabIndex={0}
      >
        {video.thumbnail && !imageError ? (
          <Image
            src={video.thumbnail}
            alt={video.title || "Video thumbnail"}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            priority={priority}
            loading={priority ? "eager" : "lazy"}
            unoptimized={!isJavhdDomain}
            onError={() => setImageError(true)}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-neutral-950 text-neutral-600">
            <Film className="h-8 w-8" />
          </div>
        )}

        {/* Hover overlay with minimal play indicator */}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none">
          <div className="h-10 w-10 border border-white bg-black/80 flex items-center justify-center transform scale-90 group-hover:scale-100 transition-transform">
            <Play className="h-4 w-4 fill-white text-white ml-0.5" />
          </div>
        </div>

        {/* Top Badges (Code/ID) */}
        {video.badge && (
          <div className="absolute top-2 left-2 z-10">
            <Badge variant="default" className="text-[10px] tracking-wider uppercase font-mono bg-black/85 border-white/20">
              {video.badge}
            </Badge>
          </div>
        )}

        {/* Duration Badge Bottom Right */}
        {video.duration && (
          <div className="absolute bottom-2 right-2 z-10">
            <span className="inline-flex items-center gap-1 bg-black/90 px-1.5 py-0.5 text-[10px] font-mono tracking-wider text-neutral-200 border border-white/20">
              <Clock className="h-2.5 w-2.5" />
              {video.duration}
            </span>
          </div>
        )}
      </Link>

      {/* Metadata & Title */}
      <div className="flex flex-1 flex-col justify-between p-3">
        <Link
          href={href}
          className="focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
        >
          <h3
            className="text-xs font-normal leading-snug text-neutral-200 line-clamp-2 break-words group-hover:text-white transition-colors"
            title={video.title}
          >
            {video.title}
          </h3>
        </Link>

        {/* Footer info: Age */}
        {video.age && (
          <div className="mt-2.5 flex items-center text-[10px] font-mono tracking-widest text-neutral-500 uppercase">
            <span>{video.age}</span>
          </div>
        )}
      </div>
    </article>
  );
}
