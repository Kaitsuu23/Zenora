"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { OrderSelect, OrderOption } from "@/components/filters/order-select";
import { PeriodSelect } from "@/components/filters/period-select";

const GENRE_ORDERS: readonly OrderOption[] = [
  { value: "recent",     label: "Terbaru"    },
  { value: "popular",    label: "Terpopuler" },
  { value: "releaseday", label: "Rilis Baru" },
  { value: "rated",      label: "Rating"     },
  { value: "discussed",  label: "Diskusi"    },
  { value: "downloaded", label: "Unduhan"    },
  { value: "longest",    label: "Durasi"     },
  { value: "watched",    label: "Ditonton"   },
] as const;

const PERIOD_ORDERS = ['popular', 'releaseday', 'rated', 'discussed', 'downloaded', 'longest', 'watched'];

interface GenreFilterBarProps {
  slug: string;
  currentOrder: string;
  currentPeriod: string;
}

/**
 * Build genre URL using path segments:
 *   /genres/asian              → recent (no suffix)
 *   /genres/asian/popular      → popular, all-time
 *   /genres/asian/popular/today → popular, today
 *   /genres/asian/releaseday   → releaseday
 */
function buildGenreUrl(slug: string, order: string, period: string): string {
  // recent = default, no order segment in URL
  if (order === "recent") return `/genres/${slug}`;

  const base = `/genres/${slug}/${order}`;
  const supportsPeriod = PERIOD_ORDERS.includes(order);
  if (supportsPeriod && period && period !== "all-time") {
    return `${base}/${period}`;
  }
  return base;
}

export function GenreFilterBar({ slug, currentOrder, currentPeriod }: GenreFilterBarProps) {
  const router = useRouter();

  const supportsPeriod = PERIOD_ORDERS.includes(currentOrder);

  const handleOrderChange = (newOrder: string) => {
    // Always reset period to all-time when switching order
    router.push(buildGenreUrl(slug, newOrder, "all-time"));
  };

  const handlePeriodChange = (newPeriod: string) => {
    router.push(buildGenreUrl(slug, currentOrder, newPeriod));
  };

  return (
    <div className="flex items-center gap-2 self-start sm:self-auto">
      <OrderSelect
        value={currentOrder}
        onChange={handleOrderChange}
        options={GENRE_ORDERS}
      />
      <PeriodSelect
        value={currentPeriod}
        onChange={handlePeriodChange}
        disabled={!supportsPeriod}
      />
    </div>
  );
}
