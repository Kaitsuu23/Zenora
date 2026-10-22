"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Film, Flame, Star, Tag, User, Tv, Search, ArrowRight, Loader2 } from "lucide-react";
import { parseVideoUrl } from "@/lib/utils";
import type { VideoItem, SearchResponse } from "@/types/api";
import { useLenis } from "@/components/providers/lenis-provider";

const POPULAR_GENRES = [
  { name: "Amateur", slug: "amateur" },
  { name: "Asian", slug: "asian" },
  { name: "Big Tits", slug: "big-tits" },
  { name: "Cosplay", slug: "cosplay" },
  { name: "Creampie", slug: "creampie" },
  { name: "Drama", slug: "drama" },
  { name: "Facials", slug: "facials" },
  { name: "Kimono", slug: "kimono" },
  { name: "Lesbian", slug: "lesbian" },
  { name: "Massage", slug: "massage" },
  { name: "Mature Woman", slug: "mature-woman" },
  { name: "Mother", slug: "mother" },
  { name: "School", slug: "school" },
  { name: "Sister", slug: "sister" },
  { name: "Squirting", slug: "squirting" },
  { name: "Teacher", slug: "teacher" },
  { name: "Uncensored JAV", slug: "uncensored-jav" },
  { name: "Young Wife", slug: "young-wife" },
];

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchModal({ open, onOpenChange }: SearchModalProps) {
  const router = useRouter();
  const lenisRef = useLenis();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [videoResults, setVideoResults] = useState<VideoItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Pause Lenis when modal is open so background page doesn't scroll
  useEffect(() => {
    if (open) {
      lenisRef?.current?.stop();
    } else {
      lenisRef?.current?.start();
    }
  }, [open, lenisRef]);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch live autocomplete video results when debounced query is >= 2 chars
  useEffect(() => {
    if (debouncedSearch.length < 2) {
      setVideoResults([]);
      setIsLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);

    fetch(`/api/proxy/search?q=${encodeURIComponent(debouncedSearch)}&o=recent`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: SearchResponse | null) => {
        if (data?.items) {
          setVideoResults(data.items.slice(0, 6));
        } else {
          setVideoResults([]);
        }
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setVideoResults([]);
        setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [debouncedSearch]);

  // Clean up on close
  useEffect(() => {
    if (!open) {
      setSearch("");
      setDebouncedSearch("");
      setVideoResults([]);
      setIsLoading(false);
    }
  }, [open]);

  // Filter matching genres
  const matchingGenres = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return POPULAR_GENRES.filter(
      (g) => g.name.toLowerCase().includes(q) || g.slug.includes(q)
    ).slice(0, 3);
  }, [search]);

  // Single navigation path: used by click AND Enter (cmdk calls onSelect for both)
  const handleSelect = (url: string) => {
    onOpenChange(false);
    router.push(url);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter" || !search.trim()) return;
    if (e.nativeEvent.isComposing) return;
    // If an item is highlighted, let cmdk run that item's onSelect instead
    const selected = document.querySelector('[cmdk-item][aria-selected="true"]');
    if (selected) return;
    handleSelect(`/search?q=${encodeURIComponent(search.trim())}`);
  };

  const hasSearch = search.trim().length >= 2;

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      shouldFilter={!hasSearch}
    >
      <CommandInput
        placeholder="Ketik judul video, kode, atau genre..."
        value={search}
        onValueChange={setSearch}
        onKeyDown={handleKeyDown}
      />
      <CommandList className="max-h-[420px] overflow-y-auto" data-lenis-prevent>
        {/* State: Query Active */}
        {hasSearch ? (
          <>
            {/* Top Shortcut: View Full Search Page */}
            <CommandGroup heading="Pencarian Lengkap">
              <CommandItem
                value={`search-${search.trim()}`}
                onSelect={() =>
                  handleSelect(`/search?q=${encodeURIComponent(search.trim())}`)
                }
                className="flex items-center justify-between gap-2 px-3 py-2.5 cursor-pointer normal-case tracking-normal border border-transparent aria-selected:bg-neutral-900 aria-selected:text-white aria-selected:border-white/20"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Search className="h-4 w-4 shrink-0" />
                  <span className="font-mono text-xs">
                    Lihat semua hasil untuk:{" "}
                    <strong className="font-bold">
                      &ldquo;{search.trim()}&rdquo;
                    </strong>
                  </span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
              </CommandItem>
            </CommandGroup>

            {/* Matching Genre Suggestions */}
            {matchingGenres.length > 0 && (
              <CommandGroup heading="Genre yang Cocok">
                {matchingGenres.map((genre) => (
                  <CommandItem
                    key={genre.slug}
                    value={`genre-${genre.slug}`}
                    onSelect={() => handleSelect(`/genres/${genre.slug}`)}
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer normal-case tracking-normal aria-selected:bg-neutral-900 aria-selected:text-white"
                  >
                    <Tag className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                    <span className="font-mono text-xs text-neutral-200">
                      Genre: <strong className="text-white">{genre.name}</strong>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-6 text-neutral-400 font-mono text-xs">
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>Mencari video yang sesuai...</span>
              </div>
            )}

            {/* Video Autocomplete Results */}
            {!isLoading && videoResults.length > 0 && (
              <CommandGroup heading={`Rekomendasi Video (${videoResults.length})`}>
                {videoResults.map((video) => {
                  const parsed = parseVideoUrl(video.url);
                  const watchHref = parsed.href || `/watch/${video.id}`;

                  return (
                    <CommandItem
                      key={video.id || video.url}
                      value={`video-${video.id}-${video.title}`}
                      onSelect={() => handleSelect(watchHref)}
                      className="group flex items-center gap-3 p-2.5 cursor-pointer normal-case tracking-normal border-b border-white/5 last:border-b-0 aria-selected:bg-neutral-900 aria-selected:text-white"
                    >
                      {/* Portrait Thumbnail */}
                      <div className="relative flex aspect-[2/3] w-10 shrink-0 items-center justify-center overflow-hidden border border-white/10 bg-neutral-900">
                        {video.thumbnail ? (
                          <Image
                            src={video.thumbnail}
                            alt={video.title}
                            fill
                            sizes="40px"
                            unoptimized
                            className="object-cover"
                          />
                        ) : (
                          <Film className="h-4 w-4 text-neutral-600" />
                        )}
                      </div>

                      {/* Video Info */}
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-mono text-xs text-neutral-200 group-aria-selected:text-white transition-colors line-clamp-2 leading-snug">
                          {video.title}
                        </span>
                        <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-neutral-500">
                          {video.duration && (
                            <span className="text-neutral-400">{video.duration}</span>
                          )}
                          {video.badge && (
                            <span className="border border-white/15 px-1 text-[9px] uppercase text-neutral-400">
                              {video.badge}
                            </span>
                          )}
                          {video.age && <span>{video.age}</span>}
                        </div>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {/* Empty State when finished loading */}
            {!isLoading && videoResults.length === 0 && matchingGenres.length === 0 && (
              <CommandEmpty>
                <div className="py-6 text-center">
                  <p className="text-xs font-mono text-neutral-400 mb-2 normal-case tracking-normal">
                    Tidak ada video ditemukan untuk &ldquo;{search}&rdquo;.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      handleSelect(`/search?q=${encodeURIComponent(search.trim())}`)
                    }
                    className="text-xs font-mono text-white underline hover:text-neutral-300 cursor-pointer normal-case tracking-normal"
                  >
                    Buka pencarian lengkap &rarr;
                  </button>
                </div>
              </CommandEmpty>
            )}
          </>
        ) : (
          /* State: Empty Query (Default Quick Jump) */
          <>
            <CommandEmpty>
              <div className="py-2 text-center text-xs font-mono text-neutral-400">
                Ketik minimal 2 karakter untuk melihat rekomendasi video.
              </div>
            </CommandEmpty>

            <CommandGroup heading="Kategori Cepat">
              <CommandItem
                value="cat-recent"
                onSelect={() => handleSelect("/browse/recent")}
                className="cursor-pointer transition-colors duration-100 aria-selected:bg-white aria-selected:text-black hover:bg-white/10"
              >
                <Film className="mr-2 h-4 w-4" />
                <span>Jav Terbaru (Recent)</span>
              </CommandItem>
              <CommandItem
                value="cat-popular"
                onSelect={() => handleSelect("/browse/popular")}
                className="cursor-pointer transition-colors duration-100 aria-selected:bg-white aria-selected:text-black hover:bg-white/10"
              >
                <Flame className="mr-2 h-4 w-4" />
                <span>Terpopuler (Popular)</span>
              </CommandItem>
              <CommandItem
                value="cat-rated"
                onSelect={() => handleSelect("/browse/rated")}
                className="cursor-pointer transition-colors duration-100 aria-selected:bg-white aria-selected:text-black hover:bg-white/10"
              >
                <Star className="mr-2 h-4 w-4" />
                <span>Rating Tertinggi (Rated)</span>
              </CommandItem>
              <CommandItem
                value="cat-genres"
                onSelect={() => handleSelect("/genres")}
                className="cursor-pointer transition-colors duration-100 aria-selected:bg-white aria-selected:text-black hover:bg-white/10"
              >
                <Tag className="mr-2 h-4 w-4" />
                <span>Daftar Genre</span>
              </CommandItem>
              <CommandItem
                value="cat-pornstars"
                onSelect={() => handleSelect("/pornstars")}
                className="cursor-pointer transition-colors duration-100 aria-selected:bg-white aria-selected:text-black hover:bg-white/10"
              >
                <User className="mr-2 h-4 w-4" />
                <span>Daftar Pornstar</span>
              </CommandItem>
              <CommandItem
                value="cat-fc2ppv"
                onSelect={() => handleSelect("/channel/fc2ppv")}
                className="cursor-pointer transition-colors duration-100 aria-selected:bg-white aria-selected:text-black hover:bg-white/10"
              >
                <Tv className="mr-2 h-4 w-4" />
                <span>Channel: FC2-PPV</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}