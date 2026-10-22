export interface VideoItem {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  duration: string;
  badge: string;
  age: string;
}

export interface Pagination {
  currentPage: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "UPSTREAM_ERROR";

export interface ApiErrorDetail {
  code: ApiErrorCode | string;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorDetail;
}

export interface HomeSection {
  section: string;
  label: string;
  seeAll: string;
  items: VideoItem[];
}

export interface HomeResponse {
  success: true;
  count: number;
  sections: HomeSection[];
}

export type BrowseType =
  | "recent"
  | "popular"
  | "releaseday"
  | "rated"
  | "discussed"
  | "downloaded"
  | "longest"
  | "watched";

export type BrowsePeriod =
  | "today"
  | "yesterday"
  | "this-week"
  | "this-month"
  | "this-year"
  | "all-time";

export interface BrowseMetaType {
  type: BrowseType;
  label: string;
  url: string;
  supportsPeriod: boolean;
  periods?: BrowsePeriod[];
  defaultPeriod?: BrowsePeriod;
}

export interface BrowseMetaResponse {
  success: true;
  count: number;
  types: BrowseMetaType[];
}

export interface BrowseResponse {
  success: true;
  type: BrowseType | string;
  period?: BrowsePeriod | string;
  page: number;
  items: VideoItem[];
  pagination: Pagination;
}

export type SearchOrder =
  | "relevance"
  | "recent"
  | "popular"
  | "rated"
  | "discussed"
  | "downloaded";

export interface SearchResponse {
  success: true;
  query: string;
  order: SearchOrder | string;
  period: BrowsePeriod | string;
  page: number;
  total: number;
  items: VideoItem[];
  pagination: Pagination;
}

export interface GenreTagItem {
  name: string;
  slug: string;
}

export interface VideoServer {
  name: string;
  type: string;
  urls: string[];
}

export interface VideoDetail {
  title: string;
  altTitles: string[];
  thumbnail: string;
  poster: string;
  description: string;
  genres: GenreTagItem[];
  tags: GenreTagItem[];
  pornstars: GenreTagItem[];
  released: string;
  studio: string;
  studioKeyword: string;
  label: {
    name: string;
    url: string;
  };
  servers: VideoServer[];
  related: {
    total: number;
    items: VideoItem[];
  };
}

export interface VideoDetailResponse extends VideoDetail {
  success: true;
}

export type GenreSortOrder = "name" | "popular" | "videos";

export interface GenreListItem {
  id: number;
  name: string;
  slug: string;
  url: string;
  thumbnail: string;
  videoCount: number;
}

export interface GenreListResponse {
  success: true;
  order: GenreSortOrder | string;
  count: number;
  genres: GenreListItem[];
}

export interface GenreDetailResponse {
  success: true;
  slug: string;
  name: string;
  order: string;
  period?: string;
  page: number;
  items: VideoItem[];
  pagination: Pagination;
}

export interface ChannelResponse {
  success: true;
  slug: string;
  name: string;
  channelId: string;
  videoCount: number;
  order: string;
  period: string;
  page: number;
  items: VideoItem[];
  pagination: Pagination;
}

export type PornstarSortOrder = "recent" | "popular" | "rated" | "subscribed" | "videos";

export interface PornstarListItem {
  name: string;
  slug: string;
  url: string;
  videoCount: number;
}

export interface PornstarListResponse {
  success: true;
  order: PornstarSortOrder | string;
  letter: string;
  page: number;
  items: PornstarListItem[];
  pagination: Pagination;
}

export interface PornstarDetailResponse {
  success: true;
  slug: string;
  name: string;
  modelId: string;
  order: string;
  page: number;
  items: VideoItem[];
  pagination: Pagination;
}

export interface TagResponse {
  success: true;
  slug: string;
  name?: string;
  page: number;
  items: VideoItem[];
  pagination: Pagination;
}

export interface StreamServerItem {
  server: string;
  canExtract: boolean;
  extractEndpoint?: string;
  embedUrl?: string;
}

export interface StreamListResponse {
  success: true;
  count: number;
  servers: StreamServerItem[];
}

export interface StreamSource {
  type: "hls" | "mp4";
  src: string;
  quality: string;
  resolution: string;
}

export interface StreamExtractResponse {
  success: true;
  server: string;
  embedUrl?: string;
  extracted: boolean;
  streams: StreamSource[];
}
