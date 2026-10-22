import React from "react";
import type { Metadata } from "next";
import { api, ApiClientError } from "@/lib/api";
import { VideoGrid } from "@/components/video/video-grid";
import { PaginationBar } from "@/components/common/pagination-bar";
import { ErrorState } from "@/components/common/error-state";
import { Tag as TagIcon } from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Tag: #${slug} — ZENORA`,
    description: `Koleksi video dengan tag #${slug} di ZENORA.`,
  };
}

export default async function TagDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { page = "1" } = await searchParams;
  const pageNum = parseInt(page, 10) || 1;

  let data = null;
  let fetchError: string | null = null;
  let isEmpty = false;

  try {
    data = await api.getTagVideos(slug, pageNum, 60);
  } catch (err: unknown) {
    if (err instanceof ApiClientError && err.code === "NOT_FOUND") {
      isEmpty = true;
    } else {
      console.error("Tag fetch error:", err);
      fetchError = err instanceof Error ? err.message : "Gagal memuat video tag.";
    }
  }

  const tagName = data?.name || slug;

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-8">
      {/* Tag Header */}
      <div className="border-b border-white/10 pb-6 mb-8">
        <div className="flex items-center gap-2 mb-2 text-xs font-mono uppercase tracking-widest text-neutral-400">
          <TagIcon className="h-3.5 w-3.5" />
          <span>Tag Filter</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-normal uppercase tracking-wider text-white font-mono">
          #{tagName}
        </h1>
      </div>

      {/* Content */}
      {fetchError ? (
        <ErrorState message={fetchError} />
      ) : (
        <>
          <VideoGrid
            videos={isEmpty ? [] : data?.items}
            emptyTitle={`Tidak Ada Video untuk #${tagName}`}
            emptyDescription="Belum ada video pada tag ini."
          />

          {data?.pagination && <PaginationBar pagination={data.pagination} />}
        </>
      )}
    </div>
  );
}
