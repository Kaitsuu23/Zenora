"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon, SlidersHorizontal } from "lucide-react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { OrderSelect, OrderOption } from "@/components/filters/order-select";
import { PeriodSelect } from "@/components/filters/period-select";
import { VideoGrid } from "@/components/video/video-grid";
import { PaginationBar } from "@/components/common/pagination-bar";
import { ErrorState } from "@/components/common/error-state";
import { EmptyState } from "@/components/common/empty-state";

const SEARCH_ORDERS: readonly OrderOption[] = [
  { value: "recent", label: "Terbaru" },
  { value: "relevance", label: "Relevansi" },
  { value: "popular", label: "Terpopuler" },
  { value: "rated", label: "Rating" },
  { value: "discussed", label: "Diskusi" },
  { value: "downloaded", label: "Unduhan" },
] as const;

export function SearchView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQ = searchParams.get("q") || "";
  const initialOrder = searchParams.get("o") || "recent";
  const initialPeriod = searchParams.get("period") || "all-time";
  const initialPage = parseInt(searchParams.get("page") || "1", 10);

  const [searchTerm, setSearchTerm] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [order, setOrder] = useState(initialOrder);
  const [period, setPeriod] = useState(initialPeriod);
  const [page, setPage] = useState(initialPage);

  // 400ms Debounce for text search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQ(searchTerm);
      setPage(1); // Reset page on query change
    }, 400);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Period only applies if order is popular, rated, discussed, or downloaded
  const supportsPeriod = ["popular", "rated", "discussed", "downloaded"].includes(order);

  // Sync to URL search params
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQ.trim()) params.set("q", debouncedQ.trim());
    if (order && order !== "recent") params.set("o", order);
    if (supportsPeriod && period && period !== "all-time") params.set("period", period);
    if (page > 1) params.set("page", page.toString());

    const query = params.toString() ? `?${params.toString()}` : "";
    router.replace(`/search${query}`, { scroll: false });
  }, [debouncedQ, order, period, page, router, supportsPeriod]);

  // TanStack Query for dynamic search
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["search", debouncedQ, order, supportsPeriod ? period : null, page],
    queryFn: () =>
      api.searchVideos({
        q: debouncedQ,
        o: order,
        period: supportsPeriod ? period : undefined,
        page,
      }),
    enabled: debouncedQ.trim().length > 0,
    staleTime: 1000 * 60 * 2,
  });

  return (
    <div className="space-y-6">
      {/* Search Input Bar & Filters */}
      <div className="border border-white/10 bg-neutral-950 p-4 space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setDebouncedQ(searchTerm.trim());
            setPage(1);
          }}
          className="relative"
          autoComplete="off"
        >
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            type="search"
            name="search-query"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                setDebouncedQ(searchTerm.trim());
                setPage(1);
              }
            }}
            placeholder="Cari judul video, kode, aktris, atau studio..."
            className="pl-10 h-11 text-sm bg-black/60 border-white/20 focus-visible:border-white [&::-webkit-search-cancel-button]:hidden"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-autocomplete="none"
            data-form-type="other"
            data-lpignore="true"
            autoFocus
          />
        </form>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-white/10">
          {/* Results count indicator on the left */}
          <div className="font-mono text-xs uppercase tracking-wider text-neutral-400">
            {isLoading ? (
              <span className="text-neutral-500">Mencari...</span>
            ) : data ? (
              <span>
                Total Hasil: <strong className="text-white font-bold">{data.total || 0}</strong>
              </span>
            ) : (
              <span className="text-neutral-500">Total Hasil: &mdash;</span>
            )}
          </div>

          {/* Filter controls on the right */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-neutral-400">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Filter:</span>
            </span>

            <OrderSelect
              value={order}
              onChange={(newOrder) => {
                setOrder(newOrder);
                setPage(1);
              }}
              options={SEARCH_ORDERS}
            />

            <PeriodSelect
              value={period}
              onChange={(newPeriod) => {
                setPeriod(newPeriod);
                setPage(1);
              }}
              disabled={!supportsPeriod}
            />
          </div>
        </div>
      </div>

      {/* Query Status / Results */}
      {!debouncedQ.trim() ? (
        <EmptyState
          title="Mulai Pencarian"
          description="Ketik kata kunci di atas untuk mencari koleksi video berdasarkan judul, kode, atau pemeran."
        />
      ) : isLoading ? (
        <VideoGrid isLoading={true} />
      ) : error ? (
        <ErrorState
          message={error instanceof Error ? error.message : "Gagal memproses pencarian."}
          onRetry={() => refetch()}
        />
      ) : (
        <>
          <VideoGrid
            videos={data?.items}
            emptyTitle={`Tidak Ada Hasil untuk "${debouncedQ}"`}
            emptyDescription="Coba gunakan kata kunci lain atau ubah pengaturan filter urutan dan periode."
          />

          {data?.pagination && (
            <PaginationBar
              pagination={data.pagination}
              onPageChange={(p) => setPage(p)}
            />
          )}
        </>
      )}
    </div>
  );
}
