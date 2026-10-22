"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Building,
  ChevronDown,
  ChevronUp,
  Tag,
  Users,
  Film,
} from "lucide-react";
import type { VideoDetail } from "@/types/api";
import { VideoPlayer } from "@/components/player/video-player";
import { TagBadge } from "@/components/common/tag-badge";
import { VideoCard } from "@/components/video/video-card";

interface WatchViewProps {
  video: VideoDetail;
  videoUrl: string;
  videoId: string;
}

export function WatchView({ video, videoUrl, videoId }: WatchViewProps) {
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  const relatedItems = video.related?.items || [];

  // Studio slug helper
  const studioSlug = video.studio
    ? video.studio.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
    : "";

  return (
    <div className="space-y-10">
      {/* 1. Main Streaming Player */}
      <VideoPlayer
        videoUrl={videoUrl}
        videoId={videoId}
        poster={video.poster || video.thumbnail}
      />

      {/* 2. Primary Metadata Section */}
      <div className="border border-white/10 bg-neutral-950 p-4 sm:p-6 md:p-8 space-y-6">
        <div className="space-y-2 pb-6 border-b border-white/10">
          <h1 className="text-lg md:text-2xl font-normal text-white leading-snug break-words">
            {video.title}
          </h1>

          {/* Alt titles for non-Latin CJK or alternative translations */}
          {video.altTitles && video.altTitles.length > 0 && (
            <div className="space-y-1 pt-1">
              {video.altTitles.map((alt, idx) => (
                <p key={idx} className="text-xs text-neutral-400 font-mono break-words leading-relaxed">
                  {alt}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Studio, Released, Label info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs font-mono">
          {video.released && (
            <div className="flex items-center gap-2 text-neutral-400">
              <Calendar className="h-4 w-4 text-neutral-500" />
              <span className="uppercase tracking-widest text-xs">Tanggal Rilis:</span>
              <span className="text-white font-bold">{video.released}</span>
            </div>
          )}

          {video.studio && (
            <div className="flex items-center gap-2 text-neutral-400 flex-wrap">
              <Building className="h-4 w-4 text-neutral-500 shrink-0" />
              <span className="uppercase tracking-widest text-xs">Studio:</span>
              <Link
                href={`/channel/${studioSlug}`}
                className="text-white font-bold hover:text-neutral-300"
              >
                {video.studio}
              </Link>
              {video.studioKeyword && (
                <>
                  <span className="text-neutral-600">·</span>
                  <span className="uppercase tracking-widest text-xs">By Keyword:</span>
                  <Link
                    href={`/search?q=${encodeURIComponent(new URL(video.studioKeyword).searchParams.get("s") ?? video.studio)}`}
                    className="text-white font-bold hover:text-neutral-300"
                  >
                    {new URL(video.studioKeyword).searchParams.get("s") ?? video.studio}
                  </Link>
                </>
              )}
            </div>
          )}

          {video.label?.name && (
            <div className="flex items-center gap-2 text-neutral-400">
              <Film className="h-4 w-4 text-neutral-500" />
              <span className="uppercase tracking-widest text-xs">Label:</span>
              <span className="text-white font-bold">{video.label.name}</span>
            </div>
          )}
        </div>

        {/* Performers / Pornstars */}
        {video.pornstars && video.pornstars.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-white/5">
            <span className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-neutral-400">
              <Users className="h-3.5 w-3.5" />
              <span>Aktris / Pemeran:</span>
            </span>
            <div className="flex flex-wrap gap-2">
              {video.pornstars.map((star) => (
                <TagBadge
                  key={star.slug}
                  label={star.name}
                  href={`/pornstar/${star.slug}`}
                  variant="default"
                />
              ))}
            </div>
          </div>
        )}

        {/* Genres & Tags */}
        <div className="space-y-4 pt-2 border-t border-white/5">
          {video.genres && video.genres.length > 0 && (
            <div className="space-y-2">
              <span className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-neutral-400">
                <Tag className="h-3.5 w-3.5" />
                <span>Genres:</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {video.genres.map((genre) => (
                  <TagBadge
                    key={genre.slug}
                    label={genre.name}
                    href={`/genres/${genre.slug}`}
                    variant="outline"
                  />
                ))}
              </div>
            </div>
          )}

          {video.tags && video.tags.length > 0 && (
            <div className="space-y-2">
              <span className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-neutral-400">
                <Tag className="h-3.5 w-3.5" />
                <span>Tags:</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {video.tags.map((tag) => (
                  <TagBadge
                    key={tag.slug}
                    label={`#${tag.name}`}
                    href={`/tag/${tag.slug}`}
                    variant="secondary"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Description (collapsible) */}
        {video.description && (
          <div className="pt-4 border-t border-white/5 space-y-2">
            <span className="font-mono text-xs uppercase tracking-widest text-neutral-400 block">
              Sinopsis & Catatan:
            </span>
            <p
              className={`text-xs text-neutral-300 font-mono leading-relaxed break-words ${
                !descriptionExpanded ? "line-clamp-3" : ""
              }`}
            >
              {video.description}
            </p>
            {video.description.length > 180 && (
              <button
                type="button"
                onClick={() => setDescriptionExpanded((prev) => !prev)}
                className="inline-flex items-center gap-1 min-h-[44px] py-2 text-xs font-mono uppercase tracking-wider text-neutral-400 hover:text-white cursor-pointer"
              >
                <span>{descriptionExpanded ? "Tutup Ringkasan" : "Baca Selengkapnya"}</span>
                {descriptionExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3. Related Videos */}
      {relatedItems.length > 0 && (
        <section className="space-y-6 pt-6 border-t border-white/10">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base md:text-lg font-normal uppercase tracking-wider text-white font-mono flex items-center gap-2">
              <span className="inline-block h-2 w-2 bg-white" />
              <span>Video Terkait</span>
            </h2>
            <span className="font-mono text-xs text-neutral-500 uppercase tracking-widest">
              Total {video.related?.total || relatedItems.length}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
            {relatedItems.map((item) => (
              <VideoCard key={item.id} video={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
