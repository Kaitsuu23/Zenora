import type { BrowseType, SearchOrder, GenreSortOrder, PornstarSortOrder } from "@/types/api";

export interface BrowseTypeMeta {
  type: BrowseType;
  label: string;
}

export const BROWSE_TYPES: readonly BrowseTypeMeta[] = [
  { type: "recent", label: "Terbaru" },
  { type: "popular", label: "Populer" },
  { type: "releaseday", label: "Rilis Baru" },
  { type: "rated", label: "Rating" },
  { type: "discussed", label: "Diskusi" },
  { type: "downloaded", label: "Unduhan" },
  { type: "longest", label: "Durasi" },
  { type: "watched", label: "Ditonton" },
] as const;

export const PERIOD_OPTIONS = [
  { value: "all-time", label: "Semua Waktu" },
  { value: "today", label: "Hari Ini" },
  { value: "yesterday", label: "Kemarin" },
  { value: "this-week", label: "Minggu Ini" },
  { value: "this-month", label: "Bulan Ini" },
  { value: "this-year", label: "Tahun Ini" },
] as const;

export interface FilterOption<T = string> {
  value: T;
  label: string;
}

export const SEARCH_ORDERS: readonly FilterOption<SearchOrder>[] = [
  { value: "recent", label: "Terbaru" },
  { value: "relevance", label: "Relevansi" },
  { value: "popular", label: "Terpopuler" },
  { value: "rated", label: "Rating" },
  { value: "discussed", label: "Diskusi" },
  { value: "downloaded", label: "Unduhan" },
] as const;

export const GENRE_SORT_OPTIONS: readonly FilterOption<GenreSortOrder>[] = [
  { value: "popular", label: "Terpopuler" },
  { value: "name", label: "Abjad (A-Z)" },
  { value: "videos", label: "Jumlah Video" },
] as const;

export const GENRE_ORDERS: readonly FilterOption[] = [
  { value: "recent", label: "Terbaru" },
  { value: "popular", label: "Terpopuler" },
  { value: "releaseday", label: "Rilis Baru" },
  { value: "rated", label: "Rating" },
  { value: "discussed", label: "Diskusi" },
  { value: "downloaded", label: "Unduhan" },
  { value: "longest", label: "Durasi" },
  { value: "watched", label: "Ditonton" },
] as const;

export const CHANNEL_ORDERS: readonly FilterOption[] = [
  { value: "recent", label: "Terbaru" },
  { value: "popular", label: "Terpopuler" },
  { value: "rated", label: "Rating" },
  { value: "discussed", label: "Diskusi" },
  { value: "downloaded", label: "Unduhan" },
  { value: "longest", label: "Durasi" },
  { value: "watched", label: "Ditonton" },
] as const;

export const PORNSTAR_ORDERS: readonly FilterOption<PornstarSortOrder>[] = [
  { value: "recent", label: "Terbaru" },
  { value: "popular", label: "Terpopuler" },
  { value: "rated", label: "Rating" },
  { value: "subscribed", label: "Subscribers" },
  { value: "videos", label: "Jumlah Video" },
] as const;

export const PORNSTAR_DETAIL_ORDERS: readonly FilterOption[] = [
  { value: "recent", label: "Terbaru" },
  { value: "popular", label: "Terpopuler" },
  { value: "rated", label: "Rating Tertinggi" },
] as const;

export const LETTERS = [
  "all",
  "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
  "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
] as const;
