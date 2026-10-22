import React, { Suspense } from "react";
import type { Metadata } from "next";
import { SearchView } from "@/components/search/search-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Pencarian Video — ZENORA",
  description: "Cari ribuan video berdasarkan judul, kode rilis, atau pemeran.",
};

export default function SearchPage() {
  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-normal uppercase tracking-wider text-white font-mono flex items-center gap-2">
          <span className="inline-block h-2 w-2 bg-white" />
          <span>Pencarian Database</span>
        </h1>
        <p className="text-xs text-neutral-400 font-mono mt-1">
          Cari berdasarkan kode rilis (misal: SONE, MIDE, STARS), nama model, atau judul.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="space-y-4">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        }
      >
        <SearchView />
      </Suspense>
    </div>
  );
}
