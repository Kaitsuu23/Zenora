import type { Metadata } from "next";
import { GenreCatalogPage } from "@/components/genres/genre-catalog-page";

export const metadata: Metadata = {
  title: "Genre Terpopuler — ZENORA",
  description: "Daftar genre video terpopuler di ZENORA.",
};

export default function PopularGenresPage() {
  return <GenreCatalogPage sortOrder="popular" />;
}
