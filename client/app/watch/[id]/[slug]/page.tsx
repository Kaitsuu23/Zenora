import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import { buildJavhdUrl } from "@/lib/utils";
import { WatchView } from "@/components/video/watch-view";
import { ErrorState } from "@/components/common/error-state";

interface PageProps {
  params: Promise<{ id: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id, slug } = await params;
  const targetUrl = buildJavhdUrl(id, slug);

  try {
    const video = await api.getVideo(targetUrl, 120);
    return {
      title: `${video.title} — Nonton di ZENORA`,
      description: video.description || `Streaming video resolusi tinggi ${video.title} di ZENORA.`,
      openGraph: {
        images: video.poster || video.thumbnail ? [video.poster || video.thumbnail] : [],
      },
    };
  } catch {
    return {
      title: "Nonton Video — ZENORA",
    };
  }
}

export default async function WatchPage({ params }: PageProps) {
  const { id, slug } = await params;

  if (!id || !slug) {
    notFound();
  }

  // Reconstruct full javhd.today URL
  const targetUrl = buildJavhdUrl(id, slug);

  // Validate URL host
  try {
    const parsed = new URL(targetUrl);
    if (parsed.hostname !== "javhd.today") {
      notFound();
    }
  } catch {
    notFound();
  }

  let video = null;
  let fetchError = null;

  try {
    video = await api.getVideo(targetUrl, 120);
  } catch (err: unknown) {
    console.error("Watch video fetch error:", err);
    fetchError = err instanceof Error ? err.message : "Gagal memuat detail video.";
  }

  if (fetchError || !video) {
    return (
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-12">
        <ErrorState
          title="Video Tidak Dapat Dimuat"
          message={fetchError || "Konten video ini tidak ditemukan atau server sedang mengalami gangguan."}
          code="NOT_FOUND"
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-6">
      <WatchView video={video} videoUrl={targetUrl} videoId={id} />
    </div>
  );
}
