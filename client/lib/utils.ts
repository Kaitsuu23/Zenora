import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Maps an internal video URL or ID to watch route
 * e.g. https://javhd.today/372626/some-slug/ -> { id: "372626", slug: "some-slug", href: "/watch/372626/some-slug" }
 */
export function parseVideoUrl(url: string): { id: string; slug: string; href: string } {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const id = parts[0] || "";
    const slug = parts[1] || "";
    return {
      id,
      slug,
      href: `/watch/${id}/${slug}`,
    };
  } catch {
    // Fallback if url is relative or just ID
    const parts = url.split("/").filter(Boolean);
    const id = parts[0] || "";
    const slug = parts[1] || "";
    return {
      id,
      slug,
      href: `/watch/${id}/${slug}`,
    };
  }
}

/**
 * Reconstructs target video URL for the backend API
 */
export function buildJavhdUrl(id: string, slug: string): string {
  const cleanId = encodeURIComponent(id.trim());
  const cleanSlug = encodeURIComponent(slug.trim());
  return `https://javhd.today/${cleanId}/${cleanSlug}/`;
}

/**
 * Formats API seeAll URLs to internal frontend routes
 * e.g. /api/browse/recent -> /browse/recent
 * /api/genre/mother -> /genres/mother
 */
export function mapSeeAllToHref(seeAll: string): string {
  if (!seeAll) return "/browse";
  let path = seeAll;
  if (path.startsWith("/api/browse/")) {
    path = path.replace("/api/browse/", "/browse/");
  } else if (path.startsWith("/api/browse")) {
    path = "/browse";
  } else if (path.startsWith("/api/genre/")) {
    path = path.replace("/api/genre/", "/genres/");
  } else if (path.startsWith("/api/genre")) {
    if (path.includes("o=popular")) {
      path = "/genres/popular";
    } else if (path.includes("o=videos")) {
      path = "/genres/videos";
    } else {
      path = "/genres";
    }
  } else if (path.startsWith("/api/channel/")) {
    path = path.replace("/api/channel/", "/channel/");
  } else if (path.startsWith("/api/tag/")) {
    path = path.replace("/api/tag/", "/tag/");
  } else if (path.startsWith("/api/pornstar/")) {
    path = path.replace("/api/pornstar/", "/pornstar/");
  } else if (path.startsWith("/api/pornstar")) {
    path = "/pornstars";
  }
  return path;
}
