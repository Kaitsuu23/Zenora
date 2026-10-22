import type {
  HomeResponse,
  BrowseMetaResponse,
  BrowseResponse,
  SearchResponse,
  VideoDetailResponse,
  GenreListResponse,
  GenreDetailResponse,
  ChannelResponse,
  PornstarListResponse,
  PornstarDetailResponse,
  TagResponse,
  StreamListResponse,
  StreamExtractResponse,
  BrowseType,
  BrowsePeriod,
  SearchOrder,
  GenreSortOrder,
  PornstarSortOrder,
  ApiErrorResponse,
} from "@/types/api";

export class ApiClientError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string = "INTERNAL_ERROR", statusCode: number = 500) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Translates API error codes to human-friendly Indonesian text
 */
export function getFriendlyErrorMessage(code?: string, defaultMsg?: string): string {
  switch (code) {
    case "RATE_LIMITED":
      return "Terlalu banyak request, coba lagi sebentar.";
    case "NOT_FOUND":
      return "Konten yang Anda cari tidak ditemukan.";
    case "BAD_REQUEST":
      return "Permintaan tidak sesuai atau parameter salah.";
    case "UPSTREAM_ERROR":
      return "Server sumber video sedang lambat atau tidak merespons.";
    case "INTERNAL_ERROR":
    default:
      return defaultMsg || "Terjadi kesalahan internal. Silakan coba beberapa saat lagi.";
  }
}

const BACKEND_URL = process.env.API_URL ?? (() => {
  if (typeof window === "undefined") {
    // Server-side: API_URL must be set
    throw new Error("API_URL environment variable is not set. Add it to your .env.local or Vercel project settings.");
  }
  return ""; // client-side always uses /api/proxy, BACKEND_URL unused
})();

async function fetchFromApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const isServer = typeof window === "undefined";
  // On server, direct request to backend. On client, route through Next.js proxy
  const baseUrl = isServer ? `${BACKEND_URL}/api` : "/api/proxy";
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const fullUrl = `${baseUrl}${normalizedEndpoint}`;

  try {
    const res = await fetch(fullUrl, {
      ...options,
      headers: {
        Accept: "application/json",
        ...options?.headers,
      },
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || (data && data.success === false)) {
      const errData = data as ApiErrorResponse | null;
      const code = errData?.error?.code || "INTERNAL_ERROR";
      const message =
        errData?.error?.message ||
        getFriendlyErrorMessage(code, res.statusText || "Gagal memuat data");
      throw new ApiClientError(message, code, res.status);
    }

    return data as T;
  } catch (error: unknown) {
    if (error instanceof ApiClientError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Gagal terhubung ke server";
    throw new ApiClientError(message, "UPSTREAM_ERROR", 502);
  }
}

export const api = {
  /**
   * GET /api/home
   */
  async getHome(revalidate = 60): Promise<HomeResponse> {
    return fetchFromApi<HomeResponse>("/home", {
      next: { revalidate },
    });
  },

  /**
   * GET /api/browse
   */
  async getBrowseTypes(): Promise<BrowseMetaResponse> {
    return fetchFromApi<BrowseMetaResponse>("/browse", {
      next: { revalidate: 3600 },
    });
  },

  /**
   * GET /api/browse/:type?period&page
   */
  async getBrowse(
    type: BrowseType | string,
    period?: BrowsePeriod | string,
    page: number = 1,
    revalidate = 60
  ): Promise<BrowseResponse> {
    const params = new URLSearchParams();
    if (period && type !== "recent") {
      params.set("period", period);
    }
    if (page > 1) {
      params.set("page", page.toString());
    }
    const query = params.toString() ? `?${params.toString()}` : "";
    return fetchFromApi<BrowseResponse>(`/browse/${type}${query}`, {
      next: { revalidate },
    });
  },

  /**
   * GET /api/search?q&o&period&page
   */
  async searchVideos(params: {
    q: string;
    o?: SearchOrder | string;
    period?: BrowsePeriod | string;
    page?: number;
  }): Promise<SearchResponse> {
    const searchParams = new URLSearchParams();
    searchParams.set("q", params.q);
    if (params.o) searchParams.set("o", params.o);
    // Period only applies to popular, rated, discussed, downloaded
    if (
      params.period &&
      params.o &&
      ["popular", "rated", "discussed", "downloaded"].includes(params.o)
    ) {
      searchParams.set("period", params.period);
    }
    if (params.page && params.page > 1) {
      searchParams.set("page", params.page.toString());
    }

    return fetchFromApi<SearchResponse>(`/search?${searchParams.toString()}`, {
      cache: "no-store",
    });
  },

  /**
   * GET /api/video?url=
   */
  async getVideo(url: string, revalidate = 120): Promise<VideoDetailResponse> {
    const encoded = encodeURIComponent(url);
    return fetchFromApi<VideoDetailResponse>(`/video?url=${encoded}`, {
      next: { revalidate },
    });
  },

  /**
   * GET /api/genre?o=name|popular|videos
   */
  async getGenres(o: GenreSortOrder = "name", revalidate = 3600): Promise<GenreListResponse> {
    return fetchFromApi<GenreListResponse>(`/genre?o=${o}`, {
      next: { revalidate },
    });
  },

  /**
   * GET /api/genre/:slug?o&period&page
   */
  async getGenreVideos(
    slug: string,
    params: {
      o?: string;
      period?: string;
      page?: number;
    } = {},
    revalidate = 60
  ): Promise<GenreDetailResponse> {
    const searchParams = new URLSearchParams();
    if (params.o) searchParams.set("o", params.o);
    // Period applies to all orders except 'recent'
    if (params.period && params.o && params.o !== "recent") {
      searchParams.set("period", params.period);
    }
    if (params.page && params.page > 1) {
      searchParams.set("page", params.page.toString());
    }
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return fetchFromApi<GenreDetailResponse>(`/genre/${slug}${query}`, {
      next: revalidate > 0 ? { revalidate } : undefined,
      cache: revalidate === 0 ? "no-store" : undefined,
    });
  },

  /**
   * GET /api/channel/:slug?o&period&page
   */
  async getChannelVideos(
    slug: string,
    params: {
      o?: string;
      period?: string;
      page?: number;
    } = {},
    revalidate = 60
  ): Promise<ChannelResponse> {
    const searchParams = new URLSearchParams();
    if (params.o) searchParams.set("o", params.o);
    if (params.period && params.o && ["popular", "rated"].includes(params.o)) {
      searchParams.set("period", params.period);
    }
    if (params.page && params.page > 1) {
      searchParams.set("page", params.page.toString());
    }
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return fetchFromApi<ChannelResponse>(`/channel/${slug}${query}`, {
      next: { revalidate },
    });
  },

  /**
   * GET /api/pornstar?o&letter&page
   */
  async getPornstars(
    params: {
      o?: PornstarSortOrder | string;
      letter?: string;
      page?: number;
    } = {},
    revalidate = 1800
  ): Promise<PornstarListResponse> {
    const searchParams = new URLSearchParams();
    if (params.o) searchParams.set("o", params.o);
    if (params.letter) searchParams.set("letter", params.letter);
    if (params.page && params.page > 1) {
      searchParams.set("page", params.page.toString());
    }
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return fetchFromApi<PornstarListResponse>(`/pornstar${query}`, {
      next: { revalidate },
    });
  },

  /**
   * GET /api/pornstar/:slug?o=recent|popular|rated&page
   */
  async getPornstarVideos(
    slug: string,
    params: {
      o?: "recent" | "popular" | "rated" | string;
      page?: number;
    } = {},
    revalidate = 60
  ): Promise<PornstarDetailResponse> {
    const searchParams = new URLSearchParams();
    if (params.o) searchParams.set("o", params.o);
    if (params.page && params.page > 1) {
      searchParams.set("page", params.page.toString());
    }
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return fetchFromApi<PornstarDetailResponse>(`/pornstar/${slug}${query}`, {
      next: { revalidate },
    });
  },

  /**
   * GET /api/tag/:slug?page
   */
  async getTagVideos(slug: string, page = 1, revalidate = 60): Promise<TagResponse> {
    const query = page > 1 ? `?page=${page}` : "";
    return fetchFromApi<TagResponse>(`/tag/${slug}${query}`, {
      next: { revalidate },
    });
  },

  /**
   * GET /api/stream?url=
   */
  async getStreams(url: string): Promise<StreamListResponse> {
    const encoded = encodeURIComponent(url);
    return fetchFromApi<StreamListResponse>(`/stream?url=${encoded}`, {
      cache: "no-store",
    });
  },

  /**
   * GET /api/stream/extract?url=&server=
   */
  async extractStream(url: string, server: string): Promise<StreamExtractResponse> {
    const encodedUrl = encodeURIComponent(url);
    const encodedServer = encodeURIComponent(server);
    return fetchFromApi<StreamExtractResponse>(
      `/stream/extract?url=${encodedUrl}&server=${encodedServer}`,
      {
        cache: "no-store",
      }
    );
  },
};
