import React from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { GenreCatalog } from "@/components/genres/genre-catalog";
import { ErrorState } from "@/components/common/error-state";
import type { GenreSortOrder } from "@/types/api";

export const GENRE_SORT_OPTIONS = [
  { value: "name",    label: "Abjad (A-Z)",    href: "/genres" },
  { value: "popular", label: "Terpopuler",    href: "/genres/popular" },
  { value: "videos",  label: "Jumlah Video",  href: "/genres/videos" },
] as const;

interface GenreCatalogPageProps {
  sortOrder: GenreSortOrder;
}

export async function GenreCatalogPage({ sortOrder }: GenreCatalogPageProps) {
  let data = null;
  let fetchError = null;

  try {
    data = await api.getGenres(sortOrder, 3600);
  } catch (err: unknown) {
    console.error("Genres fetch error:", err);
    fetchError = err instanceof Error ? err.message : "Gagal memuat daftar genre.";
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-8">
      {/* Header & Sort */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-normal uppercase tracking-wider text-white font-mono flex items-center gap-2">
            <span className="inline-block h-2 w-2 bg-white" />
            <span>Katalog Genre</span>
          </h1>
          <p className="text-xs text-neutral-400 font-mono mt-1">
            Telusuri video berdasarkan tema dan kategori favorit Anda ({data?.count || 0} kategori).
          </p>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="font-mono text-xs uppercase tracking-wider text-neutral-400 shrink-0">
            Urutkan:
          </span>
          <div className="flex items-center gap-1">
            {GENRE_SORT_OPTIONS.map((opt) => {
              const isActive = sortOrder === opt.value;
              return (
                <Link
                  key={opt.value}
                  href={opt.href}
                  className={`shrink-0 whitespace-nowrap px-3 py-2.5 min-h-[44px] flex items-center text-xs font-mono uppercase tracking-wider transition-colors border ${
                    isActive
                      ? "border-white bg-white text-black font-bold"
                      : "border-white/20 text-neutral-400 hover:text-white hover:border-white"
                  }`}
                >
                  {opt.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid of Genres with Search */}
      {fetchError ? (
        <ErrorState message={fetchError} />
      ) : (
        <GenreCatalog genres={data?.genres || []} />
      )}
    </div>
  );
}
