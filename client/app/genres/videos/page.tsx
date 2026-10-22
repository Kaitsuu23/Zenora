import type { Metadata } from "next";
import { GenreCatalogPage } from "@/components/genres/genre-catalog-page";

export const metadata: Metadata = {
  title: "Genre Video Terbanyak — ZENORA",
  description: "Daftar genre dengan jumlah video terbanyak di ZENORA.",
};

export default function VideosGenresPage() {
  return <GenreCatalogPage sortOrder="videos" />;
}
