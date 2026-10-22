import React from "react";
import type { Metadata } from "next";
import { api, ApiClientError } from "@/lib/api";
import { GenreFilterBar } from "@/components/genres/genre-filter-bar";
import { VideoGrid } from "@/components/video/video-grid";
import { PaginationBar } from "@/components/common/pagination-bar";
import { ErrorState } from "@/components/common/error-state";

/**
 * URL patterns:
 *   /genres/asian                        → order=recent, period=all-time, page=1
 *   /genres/asian/recent                 → order=recent
 *   /genres/asian/popular                → order=popular, period=all-time
 *   /genres/asian/popular/today          → order=popular, period=today
 *   /genres/asian/popular/today/2        → order=popular, period=today, page=2
 *   /genres/asian/recent/2               → order=recent, page=2
 */

const VALID_ORDERS = [
  "recent", "popular", "releaseday", "rated",
  "discussed", "downloaded", "longest", "watched",
];

const VALID_PERIODS = [
  "today", "yesterday", "this-week", "this-month", "this-year", "all-time",
];

/** Parse [...filters] path segments into { order, period, page } */
function parseFilters(filters: string[] = []) {
  let order   = "recent";
  let period  = "all-time";
  let page    = 1;

  const parts = [...filters];

  // First segment: order (if it's a valid order)
  if (parts.length > 0 && VALID_ORDERS.includes(parts[0])) {
    order = parts.shift()!;
  }

  // Next segment: period or page number
  if (parts.length > 0) {
    if (VALID_PERIODS.includes(parts[0])) {
      period = parts.shift()!;
    } else if (/^\d+$/.test(parts[0])) {
      page = parseInt(parts.shift()!, 10) || 1;
    }
  }

  // Last segment: page number
  if (parts.length > 0 && /^\d+$/.test(parts[0])) {
    page = parseInt(parts[0], 10) || 1;
  }

  return { order, period, page };
}

interface PageProps {
  params: Promise<{ slug: string; filters?: string[] }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const formattedName = slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return {
    title: `Genre: ${formattedName} — ZENORA`,
    description: `Koleksi video genre ${formattedName} di ZENORA.`,
  };
}

export default async function GenreDetailPage({ params }: PageProps) {
  const { slug, filters } = await params;
  const { order, period, page } = parseFilters(filters);

  const supportsPeriod = order !== "recent";
  const effectivePeriod = supportsPeriod ? period : undefined;

  let data = null;
  let fetchError: string | null = null;
  let isEmpty = false;

  try {
    data = await api.getGenreVideos(
      slug,
      { o: order, period: effectivePeriod, page },
      0   // no cache — order/period combos vary too much
    );
  } catch (err: unknown) {
    if (err instanceof ApiClientError && err.code === "NOT_FOUND") {
      isEmpty = true;
    } else {
      console.error("Genre detail fetch error:", err);
      fetchError = err instanceof Error ? err.message : "Gagal memuat video genre.";
    }
  }

  const genreName = data?.name || slug.replace(/-/g, " ").toUpperCase();

  // Build base path for pagination
  // recent:          /genres/[slug]            → page 2: /genres/[slug]/2
  // other:           /genres/[slug]/[order]    → page 2: /genres/[slug]/[order]/2
  // other + period:  /genres/[slug]/[order]/[period] → page 2: /genres/[slug]/[order]/[period]/2
  let paginationBase: string;
  if (order === "recent") {
    paginationBase = `/genres/${slug}`;
  } else if (supportsPeriod && period !== "all-time") {
    paginationBase = `/genres/${slug}/${order}/${period}`;
  } else {
    paginationBase = `/genres/${slug}/${order}`;
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-4 mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-normal uppercase tracking-wider text-white font-mono flex items-center gap-2">
            <span className="inline-block h-2 w-2 bg-white" />
            <span>Genre: {genreName}</span>
          </h1>
          <p className="text-xs text-neutral-400 font-mono mt-1">
            Daftar video yang termasuk dalam kategori ini.
          </p>
        </div>

        <GenreFilterBar
          slug={slug}
          currentOrder={order}
          currentPeriod={period}
        />
      </div>

      {/* Content */}
      {fetchError ? (
        <ErrorState message={fetchError} />
      ) : (
        <>
          <VideoGrid
            videos={isEmpty ? [] : data?.items}
            emptyTitle={`Tidak Ada Video untuk Genre "${genreName}"`}
            emptyDescription="Belum ada video pada kategori dan filter ini."
          />

          {data?.pagination && (
            <PaginationBar
              pagination={data.pagination}
              basePath={paginationBase}
            />
          )}
        </>
      )}
    </div>
  );
}
