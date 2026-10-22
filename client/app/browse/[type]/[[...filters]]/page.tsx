import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { api, ApiClientError } from "@/lib/api";
import { BrowseHeader } from "@/components/browse/browse-header";
import { BROWSE_TYPES } from "@/lib/constants";
import { VideoGrid } from "@/components/video/video-grid";
import { PaginationBar } from "@/components/common/pagination-bar";
import { ErrorState } from "@/components/common/error-state";
import type { BrowseType, BrowsePeriod } from "@/types/api";

const VALID_PERIODS: readonly string[] = [
  "today",
  "yesterday",
  "this-week",
  "this-month",
  "this-year",
  "all-time",
];

interface PageProps {
  params: Promise<{ type: string; filters?: string[] }>;
  searchParams: Promise<{ period?: string; page?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { type } = await params;
  const match = BROWSE_TYPES.find((t) => t.type === type);
  const title = match ? `Browse ${match.label}` : "Browse Video";
  return {
    title: `${title} — ZENORA`,
    description: `Daftar video ${title} resolusi tinggi di ZENORA.`,
  };
}

function parseFilters(filters: string[] = []) {
  let period = "all-time";
  let page = 1;

  const parts = [...filters];

  // 1. Is first part a valid period? Or page?
  if (parts.length > 0) {
    if (VALID_PERIODS.includes(parts[0].toLowerCase())) {
      period = parts.shift()!.toLowerCase();
    } else if (/^\d+$/.test(parts[0])) {
      page = parseInt(parts.shift()!, 10) || 1;
    }
  }

  // 2. Next segment: page number
  if (parts.length > 0 && /^\d+$/.test(parts[0])) {
    page = parseInt(parts.shift()!, 10) || 1;
  }

  return { period, page };
}

export default async function BrowseTypePage({ params, searchParams }: PageProps) {
  const { type, filters } = await params;
  const { period: queryPeriod, page: queryPage } = await searchParams;

  const validTypes = BROWSE_TYPES.map((b) => b.type);
  if (!validTypes.includes(type as BrowseType)) {
    notFound();
  }

  const parsed = parseFilters(filters);

  // Path period takes precedence, fallback to ?period=
  const period =
    parsed.period !== "all-time"
      ? parsed.period
      : queryPeriod && VALID_PERIODS.includes(queryPeriod)
        ? queryPeriod
        : parsed.period;

  // Path page takes precedence, fallback to ?page=
  const pageNum = parsed.page > 1 ? parsed.page : parseInt(queryPage || "1", 10) || 1;

  // Recent type never supports period
  const effectivePeriod = type === "recent" ? undefined : (period as BrowsePeriod);

  let data = null;
  let fetchError: string | null = null;
  let isEmpty = false;

  try {
    data = await api.getBrowse(type, effectivePeriod, pageNum, 60);
  } catch (err: unknown) {
    if (err instanceof ApiClientError && err.code === "NOT_FOUND") {
      isEmpty = true;
    } else {
      console.error("Browse fetch error:", err);
      fetchError = err instanceof Error ? err.message : "Gagal memuat video.";
    }
  }

  const currentLabel = BROWSE_TYPES.find((b) => b.type === type)?.label || type;

  // Base path for pagination:
  // recent:        /browse/recent                     → page 2: /browse/recent/2
  // other:         /browse/[type]                     → page 2: /browse/[type]/2
  // other+period:  /browse/[type]/[period]            → page 2: /browse/[type]/[period]/2
  let paginationBase: string;
  if (type === "recent" || period === "all-time") {
    paginationBase = `/browse/${type}`;
  } else {
    paginationBase = `/browse/${type}/${period}`;
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-8">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-normal uppercase tracking-wider text-white font-mono flex items-center gap-2">
          <span className="inline-block h-2 w-2 bg-white" />
          <span>Katalog Video: {currentLabel}</span>
        </h1>
        <p className="text-xs text-neutral-400 font-mono mt-1">
          {type === "recent"
            ? "Video terbaru yang baru saja diunggah hari ini."
            : `Menampilkan video teratas dengan filter periode ${period}.`}
        </p>
      </div>

      {/* Header controls: Tabs & Period Selector */}
      <BrowseHeader currentType={type} currentPeriod={period} />

      {/* Content */}
      {fetchError ? (
        <ErrorState message={fetchError} />
      ) : (
        <>
          <VideoGrid
            videos={isEmpty ? [] : data?.items}
            emptyTitle={`Tidak Ada Video ${currentLabel}`}
            emptyDescription="Tidak ditemukan video untuk tipe dan periode yang dipilih."
          />

          {data?.pagination && (
            <PaginationBar pagination={data.pagination} basePath={paginationBase} />
          )}
        </>
      )}
    </div>
  );
}
