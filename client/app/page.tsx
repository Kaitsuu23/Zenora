import React from "react";
import { api } from "@/lib/api";
import { HeroBanner } from "@/components/video/hero-banner";
import { SectionHeader } from "@/components/video/section-header";
import { VideoCard } from "@/components/video/video-card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { EmptyState } from "@/components/common/empty-state";

export const revalidate = 60; // 60s cache revalidation

export default async function HomePage() {
  let homeData = null;
  let fetchError = null;

  try {
    homeData = await api.getHome(60);
  } catch (err: unknown) {
    console.error("Home fetch error:", err);
    fetchError = err instanceof Error ? err.message : "Gagal memuat beranda.";
  }

  if (fetchError || !homeData || !homeData.sections || homeData.sections.length === 0) {
    return (
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-12">
        <EmptyState
          title="Gagal Memuat Beranda"
          description={fetchError || "Tidak ada section video yang dapat ditampilkan saat ini."}
          backHref="/"
          backLabel="Segarkan Halaman"
        />
      </div>
    );
  }

  // Pick first item of first section as Hero
  const firstSection = homeData.sections[0];
  const heroVideo = firstSection?.items?.[0];

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-6">
      {/* Hero Banner */}
      {heroVideo && <HeroBanner video={heroVideo} />}

      {/* Dynamic Sections */}
      <div className="space-y-12">
        {homeData.sections.map((sec) => {
          if (!sec.items || sec.items.length === 0) return null;

          return (
            <section key={sec.section} className="relative">
              <SectionHeader
                title={sec.label}
                count={sec.items.length}
                seeAll={sec.seeAll}
                seeAllLabel="Lihat Semua"
              />

              <Carousel
                opts={{
                  align: "start",
                  loop: false,
                }}
                className="w-full"
              >
                <CarouselContent>
                  {sec.items.map((video) => (
                    <CarouselItem
                      key={video.id}
                      className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6"
                    >
                      <VideoCard video={video} />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <div className="hidden md:block">
                  <CarouselPrevious />
                  <CarouselNext />
                </div>
              </Carousel>
            </section>
          );
        })}
      </div>
    </div>
  );
}
