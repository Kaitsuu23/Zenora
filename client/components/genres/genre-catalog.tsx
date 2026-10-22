"use client";

import React, { useState, useMemo } from "react";
import { Search, X, Tag } from "lucide-react";
import { GenreCard } from "@/components/genres/genre-card";
import type { GenreListItem } from "@/types/api";

interface GenreCatalogProps {
  genres: GenreListItem[];
}

export function GenreCatalog({ genres }: GenreCatalogProps) {
  const [query, setQuery] = useState("");

  const filteredGenres = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return genres;
    return genres.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.slug.toLowerCase().includes(q)
    );
  }, [genres, query]);

  return (
    <div>
      {/* Search Bar & Result Count */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari genre (misal: Milf, Uniform, Cosplay)..."
            className="w-full bg-neutral-950 border border-white/20 pl-9 pr-8 py-2 text-xs font-mono text-white placeholder:text-neutral-500 focus:border-white focus:outline-none transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Hapus pencarian"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="font-mono text-xs text-neutral-400 flex items-center gap-1.5 self-start sm:self-auto">
          {query ? (
            <span>
              Ditemukan: <strong className="text-white font-bold">{filteredGenres.length}</strong> dari {genres.length} genre
            </span>
          ) : (
            <span>
              Total: <strong className="text-white font-bold">{genres.length}</strong> genre
            </span>
          )}
        </div>
      </div>

      {/* Grid of Genres or Empty Search */}
      {filteredGenres.length === 0 ? (
        <div className="border border-white/10 bg-neutral-950/40 p-12 text-center max-w-md mx-auto my-12">
          <div className="inline-flex h-12 w-12 items-center justify-center border border-white/20 bg-neutral-900 mb-4 text-neutral-400">
            <Tag className="h-5 w-5" />
          </div>
          <h3 className="font-mono text-xs tracking-widest uppercase text-white font-medium mb-2">
            Genre Tidak Ditemukan
          </h3>
          <p className="text-xs text-neutral-400 font-mono mb-6 leading-relaxed">
            Tidak ada genre yang cocok dengan kata kunci &ldquo;{query}&rdquo;.
          </p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="inline-flex items-center border border-white/30 px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-white hover:border-white hover:bg-white hover:text-black transition-colors cursor-pointer"
          >
            Reset Pencarian
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredGenres.map((genre) => (
            <GenreCard key={genre.id || genre.slug} genre={genre} />
          ))}
        </div>
      )}
    </div>
  );
}
