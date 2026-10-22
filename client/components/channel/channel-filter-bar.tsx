"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { OrderSelect, OrderOption } from "@/components/filters/order-select";
import { PeriodSelect } from "@/components/filters/period-select";

const CHANNEL_ORDERS: readonly OrderOption[] = [
  { value: "recent", label: "Terbaru" },
  { value: "popular", label: "Terpopuler" },
  { value: "rated", label: "Rating" },
  { value: "discussed", label: "Diskusi" },
  { value: "downloaded", label: "Unduhan" },
  { value: "longest", label: "Durasi" },
  { value: "watched", label: "Ditonton" },
] as const;

// Pada channel, hanya 'popular' dan 'rated' yang memiliki filter periode
const PERIOD_ORDERS = ["popular", "rated"];

interface ChannelFilterBarProps {
  slug: string;
  currentOrder: string;
  currentPeriod: string;
}

/**
 * Builds channel URL using path segments:
 *   /channel/honnaka-new                       → recent
 *   /channel/honnaka-new/popular               → popular, all-time
 *   /channel/honnaka-new/popular/this-year     → popular, this-year
 *   /channel/honnaka-new/discussed             → discussed (no period)
 */
function buildChannelUrl(slug: string, order: string, period: string): string {
  if (order === "recent") return `/channel/${slug}`;

  const base = `/channel/${slug}/${order}`;
  const supportsPeriod = PERIOD_ORDERS.includes(order);
  if (supportsPeriod && period && period !== "all-time") {
    return `${base}/${period}`;
  }
  return base;
}

export function ChannelFilterBar({
  slug,
  currentOrder,
  currentPeriod,
}: ChannelFilterBarProps) {
  const router = useRouter();

  // Period hanya aktif untuk popular dan rated
  const supportsPeriod = PERIOD_ORDERS.includes(currentOrder);

  const handleOrderChange = (newOrder: string) => {
    // Always reset period to all-time when switching order
    router.push(buildChannelUrl(slug, newOrder, "all-time"));
  };

  const handlePeriodChange = (newPeriod: string) => {
    router.push(buildChannelUrl(slug, currentOrder, newPeriod));
  };

  return (
    <div className="flex items-center gap-2 self-start sm:self-auto">
      <OrderSelect
        value={currentOrder}
        onChange={handleOrderChange}
        options={CHANNEL_ORDERS}
      />
      <PeriodSelect
        value={currentPeriod}
        onChange={handlePeriodChange}
        disabled={!supportsPeriod}
      />
    </div>
  );
}
