import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GenreCatalogPage } from "@/components/genres/genre-catalog-page";

export const metadata: Metadata = {
  title: "Daftar Genre — ZENORA",
  description: "Eksplorasi ribuan video berdasarkan kategori dan genre.",
};

interface PageProps {
  searchParams: Promise<{ o?: string }>;
}

export default async function GenresIndexPage({ searchParams }: PageProps) {
  const { o } = await searchParams;

  // Redirect legacy query parameters to clean path URLs
  if (o === "popular") {
    redirect("/genres/popular");
  }
  if (o === "videos") {
    redirect("/genres/videos");
  }

  return <GenreCatalogPage sortOrder="name" />;
}
