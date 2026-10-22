import React from "react";
import type { Metadata } from "next";
import { api, ApiClientError } from "@/lib/api";
import { PornstarsToolbar } from "@/components/pornstars/pornstars-toolbar";
import { PornstarCard } from "@/components/pornstars/pornstar-card";
import { PaginationBar } from "@/components/common/pagination-bar";
import { ErrorState } from "@/components/common/error-state";
import { EmptyState } from "@/components/common/empty-state";
import type { PornstarSortOrder } from "@/types/api";

/**
 * URL patterns:
 *   /pornstars                      → order=recent, letter="", page=1
 *   /pornstars/2                    → order=recent, letter="", page=2
 *   /pornstars/popular              → order=popular, letter="", page=1
 *   /pornstars/popular/2            → order=popular, letter="", page=2
 *   /pornstars/a                    → order=recent, letter="a", page=1
 *   /pornstars/a/2                  → order=recent, letter="a", page=2
 *   /pornstars/a/popular            → order=popular, letter="a", page=1
 *   /pornstars/a/popular/2          → order=popular, letter="a", page=2
 */

const VALID_ORDERS = ["recent", "popular", "rated", "subscribed", "videos"];

interface PageProps {
  params: Promise<{ filters?: string[] }>;
  searchParams: Promise<{ letter?: string }>;
}

export const metadata: Metadata = {
  title: "Daftar Pornstar & Aktris — ZENORA",
  description: "Jelajahi profil ribuan pornstar dan aktris video di ZENORA.",
};

function parseFilters(filters: string[] = []) {
  let letter = "";
  let order = "recent";
  let page = 1;

  const parts = [...filters];

  // 1. First segment: is it a letter? (e.g. single character a-z, or "all")
  if (parts.length > 0 && (/^[a-zA-Z]$/.test(parts[0]) || parts[0].toLowerCase() === "all")) {
    const l = parts.shift()!.toLowerCase();
    letter = l === "all" ? "" : l;
  }

  // 2. Next segment: is it a valid order? (e.g. "popular", "rated", etc.)
  if (parts.length > 0 && VALID_ORDERS.includes(parts[0].toLowerCase())) {
    order = parts.shift()!.toLowerCase();
  }

  // 3. Next segment: is it a page number?
  if (parts.length > 0 && /^\d+$/.test(parts[0])) {
    page = parseInt(parts.shift()!, 10) || 1;
  }

  return { letter, order, page };
}

export default async function PornstarsListPage({ params, searchParams }: PageProps) {
  const { filters } = await params;
  const { letter: searchLetter = "" } = await searchParams;
  const parsed = parseFilters(filters);

  // Path-based letter takes precedence, fall back to ?letter= if present
  const effectiveLetter =
    parsed.letter || (searchLetter && searchLetter !== "all" ? searchLetter.toLowerCase() : "");
  const order = parsed.order;
  const page = parsed.page;

  let data = null;
  let fetchError: string | null = null;

  try {
    data = await api.getPornstars(
      { o: order as PornstarSortOrder, letter: effectiveLetter || undefined, page },
      1800
    );
  } catch (err: unknown) {
    if (!(err instanceof ApiClientError && err.code === "NOT_FOUND")) {
      console.error("Pornstar fetch error:", err);
      fetchError = err instanceof Error ? err.message : "Gagal memuat daftar pornstar.";
    }
  }

  // Base path for pagination:
  // e.g. /pornstars/a, /pornstars/a/popular, /pornstars/popular, /pornstars
  const segments: string[] = [];
  if (effectiveLetter) segments.push(effectiveLetter);
  if (order !== "recent") segments.push(order);

  const paginationBase = `/pornstars${segments.length ? `/${segments.join("/")}` : ""}`;

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-normal uppercase tracking-wider text-white font-mono flex items-center gap-2">
          <span className="inline-block h-2 w-2 bg-white" />
          <span>Indeks Pornstar</span>
        </h1>
        <p className="text-xs text-neutral-400 font-mono mt-1">
          Daftar seluruh pornstar dan aktris film dewasa berdasarkan alfabet atau popularitas.
        </p>
      </div>

      <PornstarsToolbar currentOrder={order} currentLetter={effectiveLetter} />

      {fetchError ? (
        <ErrorState message={fetchError} />
      ) : !data?.items || data.items.length === 0 ? (
        <EmptyState
          title="Tidak Ada Pornstar Ditemukan"
          description="Tidak ditemukan pornstar dengan filter abjad atau urutan yang dipilih."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {data.items.map((pornstar) => (
              <PornstarCard key={pornstar.slug} pornstar={pornstar} />
            ))}
          </div>
          {data.pagination && (
            <PaginationBar pagination={data.pagination} basePath={paginationBase} />
          )}
        </>
      )}
    </div>
  );
}
