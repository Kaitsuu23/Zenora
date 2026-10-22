import React from "react";
import type { Metadata } from "next";
import { api, ApiClientError } from "@/lib/api";
import { ChannelFilterBar } from "@/components/channel/channel-filter-bar";
import { VideoGrid } from "@/components/video/video-grid";
import { PaginationBar } from "@/components/common/pagination-bar";
import { ErrorState } from "@/components/common/error-state";
import { Tv } from "lucide-react";

/**
 * URL patterns:
 *   /channel/[slug]                            → order=recent, period=all-time, page=1
 *   /channel/[slug]/2                          → order=recent, period=all-time, page=2
 *   /channel/[slug]/popular                    → order=popular, period=all-time, page=1
 *   /channel/[slug]/popular/2                  → order=popular, period=all-time, page=2
 *   /channel/[slug]/popular/this-year          → order=popular, period=this-year, page=1
 *   /channel/[slug]/popular/this-year/2        → order=popular, period=this-year, page=2
 */

const VALID_ORDERS = [
  "recent",
  "popular",
  "rated",
  "discussed",
  "downloaded",
  "longest",
  "watched",
];

const VALID_PERIODS = [
  "today",
  "yesterday",
  "this-week",
  "this-month",
  "this-year",
  "all-time",
];

/** Parse [...filters] path segments into { order, period, page } */
function parseFilters(filters: string[] = []) {
  let order = "recent";
  let period = "all-time";
  let page = 1;

  const parts = [...filters];

  // First segment: order (if it's a valid order)
  if (parts.length > 0 && VALID_ORDERS.includes(parts[0].toLowerCase())) {
    order = parts.shift()!.toLowerCase();
  }

  // Next segment: period or page number
  if (parts.length > 0) {
    if (VALID_PERIODS.includes(parts[0].toLowerCase())) {
      period = parts.shift()!.toLowerCase();
    } else if (/^\d+$/.test(parts[0])) {
      page = parseInt(parts.shift()!, 10) || 1;
    }
  }

  // Last segment: page number
  if (parts.length > 0 && /^\d+$/.test(parts[0])) {
    page = parseInt(parts.shift()!, 10) || 1;
  }

  return { order, period, page };
}

interface PageProps {
  params: Promise<{ slug: string; filters?: string[] }>;
  searchParams: Promise<{ o?: string; period?: string; page?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Channel: ${slug.toUpperCase()} — ZENORA`,
    description: `Daftar video dari studio/channel ${slug} di ZENORA.`,
  };
}

export default async function ChannelDetailPage({ params, searchParams }: PageProps) {
  const { slug, filters } = await params;
  const cleanSlug = slug.toLowerCase();
  const { o: queryOrder, period: queryPeriod, page: queryPage } = await searchParams;

  const parsed = parseFilters(filters);

  // Path order takes precedence, fallback to ?o=
  const order =
    parsed.order !== "recent"
      ? parsed.order
      : queryOrder && VALID_ORDERS.includes(queryOrder)
        ? queryOrder
        : parsed.order;

  // Path period takes precedence, fallback to ?period=
  const period =
    parsed.period !== "all-time"
      ? parsed.period
      : queryPeriod && VALID_PERIODS.includes(queryPeriod)
        ? queryPeriod
        : parsed.period;

  // Path page takes precedence, fallback to ?page=
  const page = parsed.page > 1 ? parsed.page : parseInt(queryPage || "1", 10) || 1;

  const PERIOD_ORDERS = ["popular", "rated"];
  const supportsPeriod = PERIOD_ORDERS.includes(order);
  const effectivePeriod = supportsPeriod ? period : undefined;

  let data = null;
  let fetchError: string | null = null;
  let isEmpty = false;

  try {
    data = await api.getChannelVideos(cleanSlug, { o: order, period: effectivePeriod, page }, 60);
  } catch (err: unknown) {
    if (err instanceof ApiClientError && err.code === "NOT_FOUND") {
      isEmpty = true;
    } else {
      console.error("Channel fetch error:", err);
      fetchError = err instanceof Error ? err.message : "Gagal memuat video studio.";
    }
  }

  const channelName = data?.name || cleanSlug.toUpperCase();

  // Base path for pagination:
  // recent:          /channel/[slug]                     → page 2: /channel/[slug]/2
  // other:           /channel/[slug]/[order]             → page 2: /channel/[slug]/[order]/2
  // other + period:  /channel/[slug]/[order]/[period]    → page 2: /channel/[slug]/[order]/[period]/2
  let paginationBase: string;
  if (order === "recent") {
    paginationBase = `/channel/${cleanSlug}`;
  } else if (supportsPeriod && period !== "all-time") {
    paginationBase = `/channel/${cleanSlug}/${order}/${period}`;
  } else {
    paginationBase = `/channel/${cleanSlug}/${order}`;
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-8">
      {/* Studio Header Banner */}
      <div className="border border-white/10 bg-neutral-950 p-6 md:p-8 mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="inline-flex h-9 w-9 items-center justify-center border border-white/20 bg-neutral-900 text-white">
            <Tv className="h-4 w-4" />
          </div>
          <span className="font-mono text-xs uppercase tracking-widest text-neutral-400">
            Studio / Production Channel
          </span>
        </div>

        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4">
          <h1 className="text-2xl md:text-3xl font-normal uppercase tracking-wider text-white font-mono">
            {channelName}
          </h1>

          {typeof data?.videoCount === "number" && (
            <span className="font-mono text-xs tracking-widest text-neutral-400 uppercase">
              Total Rilis: <strong className="text-white font-bold">{data.videoCount}</strong> Video
            </span>
          )}
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4 mb-6">
        <span className="font-mono text-xs uppercase tracking-wider text-neutral-400">
          Koleksi Video Channel
        </span>
        <ChannelFilterBar slug={cleanSlug} currentOrder={order} currentPeriod={period} />
      </div>

      {/* Content */}
      {fetchError ? (
        <ErrorState message={fetchError} />
      ) : (
        <>
          <VideoGrid
            videos={isEmpty ? [] : data?.items}
            emptyTitle={`Tidak Ada Video untuk Channel "${channelName}"`}
            emptyDescription="Belum ada video dari studio ini pada filter yang dipilih."
          />

          {data?.pagination && <PaginationBar pagination={data.pagination} basePath={paginationBase} />}
        </>
      )}
    </div>
  );
}
