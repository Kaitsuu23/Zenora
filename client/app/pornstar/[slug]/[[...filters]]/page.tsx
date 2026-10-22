import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { api, ApiClientError } from "@/lib/api";
import { VideoGrid } from "@/components/video/video-grid";
import { PaginationBar } from "@/components/common/pagination-bar";
import { ErrorState } from "@/components/common/error-state";
import { UserCheck } from "lucide-react";

/**
 * URL patterns:
 *   /pornstar/[slug]            → order=recent, page=1
 *   /pornstar/[slug]/2          → order=recent, page=2
 *   /pornstar/[slug]/popular    → order=popular, page=1
 *   /pornstar/[slug]/popular/2  → order=popular, page=2
 *   /pornstar/[slug]/rated      → order=rated, page=1
 *   /pornstar/[slug]/rated/2    → order=rated, page=2
 */

const VALID_ORDERS = ["recent", "popular", "rated"] as const;
type PornstarOrder = (typeof VALID_ORDERS)[number];

const PORNSTAR_ORDERS = [
  { value: "recent", label: "Terbaru" },
  { value: "popular", label: "Terpopuler" },
  { value: "rated", label: "Rating Tertinggi" },
] as const;

interface PageProps {
  params: Promise<{ slug: string; filters?: string[] }>;
  searchParams: Promise<{ o?: string; page?: string }>;
}

function parseFilters(filters: string[] = []) {
  let order: PornstarOrder = "recent";
  let page = 1;

  const parts = [...filters];

  // 1. First segment: order?
  if (parts.length > 0 && VALID_ORDERS.includes(parts[0].toLowerCase() as PornstarOrder)) {
    order = parts.shift()!.toLowerCase() as PornstarOrder;
  }

  // 2. Next segment: page?
  if (parts.length > 0 && /^\d+$/.test(parts[0])) {
    page = parseInt(parts.shift()!, 10) || 1;
  }

  return { order, page };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const name = slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return {
    title: `${name} — ZENORA`,
    description: `Koleksi seluruh video yang dibintangi oleh ${name}.`,
  };
}

export default async function PornstarDetailPage({ params, searchParams }: PageProps) {
  const { slug, filters } = await params;
  const { o: queryOrder, page: queryPage } = await searchParams;

  const parsed = parseFilters(filters);

  // Path order takes precedence, fallback to ?o=
  const effectiveOrder: PornstarOrder =
    parsed.order !== "recent"
      ? parsed.order
      : queryOrder && VALID_ORDERS.includes(queryOrder as PornstarOrder)
        ? (queryOrder as PornstarOrder)
        : parsed.order;

  // Path page takes precedence, fallback to ?page=
  const effectivePage = parsed.page > 1 ? parsed.page : parseInt(queryPage || "1", 10) || 1;

  let data = null;
  let fetchError: string | null = null;
  let isEmpty = false;

  try {
    data = await api.getPornstarVideos(slug, { o: effectiveOrder, page: effectivePage }, 60);
  } catch (err: unknown) {
    if (err instanceof ApiClientError && err.code === "NOT_FOUND") {
      isEmpty = true;
    } else {
      console.error("Pornstar detail fetch error:", err);
      fetchError = err instanceof Error ? err.message : "Gagal memuat profil pornstar.";
    }
  }

  const pornstarName = data?.name || slug.replace(/-/g, " ").toUpperCase();

  // Base path for pagination:
  // e.g. /pornstar/yumi-kazama or /pornstar/yumi-kazama/popular
  const paginationBase =
    effectiveOrder === "recent" ? `/pornstar/${slug}` : `/pornstar/${slug}/${effectiveOrder}`;

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-8">
      {/* Model Header Banner */}
      <div className="border border-white/10 bg-neutral-950 p-6 md:p-8 mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="inline-flex h-9 w-9 items-center justify-center border border-white/20 bg-neutral-900 text-white">
            <UserCheck className="h-4 w-4" />
          </div>
          <span className="font-mono text-xs uppercase tracking-widest text-neutral-400">
            Profil Pornstar
          </span>
        </div>

        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4">
          <h1 className="text-2xl md:text-3xl font-normal uppercase tracking-wider text-white font-mono">
            {pornstarName}
          </h1>
        </div>
      </div>

      {/* Order Tabs */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
        <span className="font-mono text-xs uppercase tracking-wider text-neutral-400">
          Daftar Video
        </span>
        <div className="flex items-center gap-1">
          {PORNSTAR_ORDERS.map((opt) => {
            const isActive = effectiveOrder === opt.value;
            const targetHref =
              opt.value === "recent" ? `/pornstar/${slug}` : `/pornstar/${slug}/${opt.value}`;

            return (
              <Link
                key={opt.value}
                href={targetHref}
                className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors border ${
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

      {/* Content */}
      {fetchError ? (
        <ErrorState message={fetchError} />
      ) : (
        <>
          <VideoGrid
            videos={isEmpty ? [] : data?.items}
            emptyTitle={`Tidak Ada Video untuk ${pornstarName}`}
            emptyDescription="Belum ada video dari pornstar ini pada filter yang dipilih."
          />

          {data?.pagination && (
            <PaginationBar pagination={data.pagination} basePath={paginationBase} />
          )}
        </>
      )}
    </div>
  );
}
