"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { OrderSelect, OrderOption } from "@/components/filters/order-select";

const PORNSTAR_ORDERS: readonly OrderOption[] = [
  { value: "recent",     label: "Terbaru"       },
  { value: "popular",    label: "Terpopuler"    },
  { value: "rated",      label: "Rating"        },
  { value: "subscribed", label: "Subscribers"   },
  { value: "videos",     label: "Jumlah Video"  },
] as const;

const LETTERS = [
  "all",
  "a","b","c","d","e","f","g","h","i","j","k","l","m",
  "n","o","p","q","r","s","t","u","v","w","x","y","z",
] as const;

interface PornstarsToolbarProps {
  currentOrder: string;
  currentLetter: string;
}

/**
 * Builds path-based pornstars URL:
 *   /pornstars
 *   /pornstars/a
 *   /pornstars/a/popular
 *   /pornstars/popular
 */
export function buildPornstarsUrl(order: string, letter: string, page?: number): string {
  const segments: string[] = [];
  const cleanLetter = letter && letter.toLowerCase() !== "all" ? letter.toLowerCase() : "";
  const isRecent = !order || order === "recent";

  if (cleanLetter) {
    segments.push(cleanLetter);
  }

  if (!isRecent) {
    segments.push(order);
  }

  if (page && page > 1) {
    segments.push(String(page));
  }

  return `/pornstars${segments.length ? `/${segments.join("/")}` : ""}`;
}

export function PornstarsToolbar({ currentOrder, currentLetter }: PornstarsToolbarProps) {
  const router = useRouter();

  const handleOrderChange  = (newOrder: string) => router.push(buildPornstarsUrl(newOrder, currentLetter));
  const handleLetterChange = (letter: string)   => router.push(buildPornstarsUrl(currentOrder, letter));

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6 mb-8">
      {/* Alphabet Letters Filter */}
      <div className="flex flex-wrap items-center gap-1 overflow-x-auto py-1">
        {LETTERS.map((letter) => {
          const isActive =
            (!currentLetter && letter === "all") ||
            currentLetter.toLowerCase() === letter.toLowerCase();

          return (
            <button
              key={letter}
              type="button"
              onClick={() => handleLetterChange(letter)}
              className={`h-7 min-w-7 px-1.5 text-[11px] font-mono uppercase tracking-wider transition-all border cursor-pointer ${
                isActive
                  ? "border-white bg-white text-black font-bold"
                  : "border-white/10 bg-neutral-950 text-neutral-400 hover:border-white/30 hover:text-white"
              }`}
            >
              {letter}
            </button>
          );
        })}
      </div>

      {/* Order dropdown aligned right */}
      <div className="shrink-0 self-start md:self-center">
        <OrderSelect
          value={currentOrder}
          onChange={handleOrderChange}
          options={PORNSTAR_ORDERS}
        />
      </div>
    </div>
  );
}
