import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Clock, Calendar } from "lucide-react";
import type { VideoItem } from "@/types/api";
import { parseVideoUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface HeroBannerProps {
  video: VideoItem;
}

export function HeroBanner({ video }: HeroBannerProps) {
  const { href } = parseVideoUrl(video.url);

  const isJavhdDomain =
    video.thumbnail?.includes("pics.javhd.today") ||
    video.thumbnail?.includes("cdn10.javtop.fun");

  return (
    <div className="relative mb-12 w-full overflow-hidden border border-white/10 bg-neutral-950">
      <div className="relative aspect-[21/9] min-h-[360px] md:min-h-[460px] w-full">
        {video.thumbnail && (
          <Image
            src={video.thumbnail}
            alt={video.title}
            fill
            priority
            unoptimized={!isJavhdDomain}
            className="object-cover object-center filter grayscale contrast-125 opacity-40 hover:opacity-60 transition-opacity duration-700"
          />
        )}

        {/* Gradient dark overlays for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent" />

        {/* Hero Content */}
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-12 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge variant="solid" className="text-[10px] font-mono tracking-widest uppercase">
              Highlight Hari Ini
            </Badge>
            {video.badge && (
              <Badge variant="default" className="text-[10px] font-mono tracking-widest uppercase">
                {video.badge}
              </Badge>
            )}
            {video.duration && (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-neutral-300">
                <Clock className="h-3 w-3" />
                {video.duration}
              </span>
            )}
            {video.age && (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-neutral-400">
                <Calendar className="h-3 w-3" />
                {video.age}
              </span>
            )}
          </div>

          <h1 className="text-xl md:text-3xl lg:text-4xl font-normal text-white leading-tight mb-4 tracking-tight line-clamp-2 break-words">
            {video.title}
          </h1>

          <div className="flex flex-wrap items-center gap-3 mt-2">
            <Button asChild size="default" className="gap-2 px-6">
              <Link href={href}>
                <Play className="h-3.5 w-3.5 fill-black" />
                <span>Putar Sekarang</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
