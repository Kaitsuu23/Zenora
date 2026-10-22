"use client";

import React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import type { Pagination as PaginationType } from "@/types/api";

interface PaginationBarProps {
  pagination: PaginationType;
  onPageChange?: (page: number) => void;
  /** If provided, generates path-based URLs: basePath/2, basePath/3, etc.
   *  If omitted, falls back to ?page=N query param. */
  basePath?: string;
}

export function PaginationBar({ pagination, onPageChange, basePath }: PaginationBarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currentPage, totalPages, hasNext, hasPrev } = pagination;

  if (totalPages <= 1) return null;

  const createPageUrl = (page: number) => {
    // Path-based: /genres/asian/popular/today/2
    if (basePath) {
      return page <= 1 ? basePath : `${basePath}/${page}`;
    }
    // Query-based: ?page=2
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    return `${pathname}?${params.toString()}`;
  };

  // Generate page numbers window (e.g. 1 ... 4 5 6 ... 20)
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    pages.push(1);

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    if (start > 2) pages.push("ellipsis");
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (end < totalPages - 1) pages.push("ellipsis");

    pages.push(totalPages);
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className="my-10 flex justify-center">
      <Pagination>
        <PaginationContent>
          {hasPrev && (
            <PaginationItem>
              {onPageChange ? (
                  <button
                  onClick={() => onPageChange(currentPage - 1)}
                  className="flex items-center gap-1 border border-white/20 px-3 min-h-[44px] text-xs font-mono uppercase text-white hover:border-white transition-colors cursor-pointer"
                >
                  Prev
                </button>
              ) : (
                <PaginationPrevious href={createPageUrl(currentPage - 1)} />
              )}
            </PaginationItem>
          )}

          {pages.map((p, idx) => {
            if (p === "ellipsis") {
              return (
                <PaginationItem key={`ellipsis-${idx}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              );
            }

            const isActive = p === currentPage;

            return (
              <PaginationItem key={p}>
                {onPageChange ? (
                  <button
                    onClick={() => onPageChange(p)}
                    className={`min-w-[40px] min-h-[44px] border px-3 text-xs font-mono transition-colors cursor-pointer ${
                      isActive
                        ? "border-white bg-white text-black font-bold"
                        : "border-white/20 bg-transparent text-white hover:border-white"
                    }`}
                  >
                    {p}
                  </button>
                ) : (
                  <PaginationLink href={createPageUrl(p)} isActive={isActive}>
                    {p}
                  </PaginationLink>
                )}
              </PaginationItem>
            );
          })}

          {hasNext && (
            <PaginationItem>
              {onPageChange ? (
                  <button
                  onClick={() => onPageChange(currentPage + 1)}
                  className="flex items-center gap-1 border border-white/20 px-3 min-h-[44px] text-xs font-mono uppercase text-white hover:border-white transition-colors cursor-pointer"
                >
                  Next
                </button>
              ) : (
                <PaginationNext href={createPageUrl(currentPage + 1)} />
              )}
            </PaginationItem>
          )}
        </PaginationContent>
      </Pagination>
    </div>
  );
}
