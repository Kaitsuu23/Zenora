# Zenora

REST API scraper + Next.js frontend untuk `https://javhd.today/`.

Backend: **Node.js + Express + Axios + Cheerio** — hanya HTTP request biasa, tanpa browser headless.  
Frontend: **Next.js 15 + TailwindCSS + ArtPlayer** — streaming langsung di browser lewat proxy HLS.

---

## Struktur Project

```
javhd-api/
├── src/                     # Backend (Express API)
│   ├── index.js             # Entry point
│   ├── config.js            # Loader .env + validasi
│   ├── utils/
│   │   ├── http.js          # Axios client + retry + headers
│   │   ├── errors.js        # ApiError + error handler middleware
│   │   └── validators.js    # Validasi input
│   ├── scrapers/
│   │   ├── parser.js        # Parser Cheerio shared
│   │   ├── home.js          # Homepage sections
│   │   ├── search.js        # Search results
│   │   ├── video.js         # Video detail + related
│   │   ├── genre.js         # Genre list + genre videos
│   │   ├── channel.js       # Channel/studio pages
│   │   ├── browse.js        # Browse pages
│   │   ├── pornstar.js      # Pornstar list + detail
│   │   ├── tag.js           # Tag pages
│   │   └── stream.js        # Stream URL extraction (semua server)
│   └── routes/
│       ├── home.js          # GET /api/home
│       ├── search.js        # GET /api/search
│       ├── video.js         # GET /api/video
│       ├── genre.js         # GET /api/genre
│       ├── channel.js       # GET /api/channel
│       ├── browse.js        # GET /api/browse
│       ├── pornstar.js      # GET /api/pornstar
│       ├── tag.js           # GET /api/tag
│       ├── stream.js        # GET /api/stream + /api/stream/extract
│       ├── stream-play.js   # GET /api/stream/play (extract + proxy m3u8)
│       └── hlsproxy.js      # GET /api/hlsproxy (CDN segment proxy)
└── client/                  # Frontend (Next.js)
    ├── app/                 # App Router pages
    ├── components/
    │   ├── player/          # VideoPlayer (ArtPlayer + HLS.js)
    │   ├── navigation/      # Navbar, Footer, SearchModal
    │   └── ...
    └── lib/
        └── api.ts           # API client (calls backend via proxy)
```

---

## Stack

### Backend
| Library | Fungsi |
|---------|--------|
| express | HTTP server / routing |
| axios | HTTP request ke target website |
| cheerio | Parse HTML |
| cors | CORS middleware |
| dotenv | Load konfigurasi dari `.env` |

### Frontend
| Library | Fungsi |
|---------|--------|
| Next.js 15 | Framework (App Router, Turbopack) |
| TailwindCSS 4 | Styling |
| ArtPlayer | Video player (fullscreen, PiP, quality selector) |
| HLS.js | HLS stream playback |
| Lenis | Smooth scroll |
| TanStack Query | Data fetching + caching |

---

## Setup

### Backend

```bash
# Install dependencies
npm install

# Copy konfigurasi
cp .env.example .env

# Jalankan server (port 3000)
npm start

# Dev mode (auto-restart)
npm run dev
```

### Frontend

```bash
cd client

# Install dependencies
npm install

# Copy konfigurasi
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL ke URL backend

# Dev mode (port 3001 by default)
npm run dev

# Production build
npm run build && npm start
```

---

## Konfigurasi

### Backend (`.env`)

| Key | Default | Keterangan |
|-----|---------|------------|
| `PORT` | `3000` | Port server |
| `BASE_URL` | `https://javhd.today` | URL target |
| `CORS_ORIGIN` | `*` | Origin CORS |
| `REQUEST_TIMEOUT` | `20000` | Timeout request ke target (ms) |
| `MAX_RETRIES` | `2` | Retry maksimum saat request gagal |
| `NODE_TLS_REJECT_UNAUTHORIZED` | `0` | `0` = relax TLS (target self-signed) |

### Frontend (`client/.env.local`)

| Key | Keterangan |
|-----|------------|
| `API_URL` | URL backend (default: `http://localhost:3000`) |

---

## API Endpoints

### `GET /health`
Health check.

---

### `GET /api/home`
Homepage sections.

```json
{
  "success": true,
  "count": 10,
  "sections": [
    {
      "section": "recent",
      "label": "Jav Uploaded Today",
      "seeAll": "/api/browse/recent",
      "items": [{ "id": "372626", "title": "...", "thumbnail": "...", "duration": "01:59:00" }]
    }
  ]
}
```

---

### `GET /api/browse/:type`

| Parameter | Nilai | Default |
|-----------|-------|---------|
| `:type` | `recent` `popular` `releaseday` `rated` `discussed` `downloaded` `longest` `watched` | — |
| `?period` | `today` `yesterday` `this-week` `this-month` `this-year` `all-time` | `all-time` |
| `?page` | angka | `1` |

> `recent` tidak support `?period`.

---

### `GET /api/search`

| Parameter | Keterangan | Default |
|-----------|-----------|---------|
| `?q` | Keyword (wajib) | — |
| `?o` | `relevance` `recent` `popular` `rated` `discussed` `downloaded` | `recent` |
| `?period` | `today` `yesterday` `this-week` `this-month` `this-year` `all-time` | `all-time` |
| `?page` | angka | `1` |

---

### `GET /api/video`

| Parameter | Keterangan |
|-----------|-----------|
| `?url` | URL video `javhd.today` (wajib) |

```json
{
  "success": true,
  "title": "...",
  "thumbnail": "...",
  "poster": "...",
  "genres": [{ "name": "Creampie", "slug": "creampie" }],
  "pornstars": [{ "name": "Maki Hojo", "slug": "maki-hojo" }],
  "released": "2015-05-13",
  "studio": "Tameike Goro-",
  "studioKeyword": "https://javhd.today/search/video/?s=Tameike+Goro-",
  "label": { "name": "Tameike Goro-" },
  "related": { "total": 274463, "items": [...] }
}
```

---

### `GET /api/genre`
List semua genre. `?o` = `name` | `popular` | `videos`

### `GET /api/genre/:slug`
Video dalam suatu genre. `?o`, `?period`, `?page`

### `GET /api/channel/:slug`
Video dari studio/channel. `?o`, `?period`, `?page`

### `GET /api/pornstar`
List pornstar. `?o`, `?letter`, `?page`

### `GET /api/pornstar/:slug`
Video dari pornstar. `?o`, `?page`

### `GET /api/tag/:slug`
Video berdasarkan tag. `?page`

---

### `GET /api/stream`
List embed server dari halaman video. Cepat — hanya parse HTML, tidak extract.  
Hasil di-cache 60 detik untuk `/api/stream/extract`.

| Parameter | Keterangan |
|-----------|-----------|
| `?url` | URL video `javhd.today` (wajib) |

```json
{
  "success": true,
  "count": 9,
  "servers": [
    { "server": "Myserver",   "canExtract": true,  "extractEndpoint": "/api/stream/extract?..." },
    { "server": "Maxcloud",   "canExtract": true,  "extractEndpoint": "/api/stream/extract?..." },
    { "server": "Pmate",      "canExtract": true,  "extractEndpoint": "/api/stream/extract?..." },
    { "server": "Cloudwish",  "canExtract": true,  "extractEndpoint": "/api/stream/extract?..." },
    { "server": "STserver",   "canExtract": false, "embedUrl": "..." },
    { "server": "Streamtape", "canExtract": false, "embedUrl": "..." }
  ]
}
```

**Server yang bisa di-extract (`canExtract: true`):**

| Server | CDN | Quality |
|--------|-----|---------|
| Myserver | streamhg / acek-cdn | 480p / 720p / 1080p |
| BpServer | streamhg / acek-cdn | 480p / 720p / 1080p |
| Fastserver | f4scdn | 480p / 720p / 1080p |
| Topserver | javhdz proxy | auto (mp4) |
| Maxcloud | plauymito.live (HLS master) | 720p / 1080p |
| Pmate | plauymito.live (HLS master) | 720p / 1080p |
| Cloudwish | premilkyway CDN | 480p / 720p / 1080p |
| Mycloudz | dramiyos CDN | 480p / 720p / 1080p |
| Mangocloud | 97bf1.com | 480p / 720p / 1080p |

**Server iframe saja (`canExtract: false`):** STserver, Upnshare, Streamtape, Dood

---

### `GET /api/stream/extract`
Extract stream URL dari satu server.

| Parameter | Keterangan |
|-----------|-----------|
| `?url` | URL video `javhd.today` (wajib) |
| `?server` | Nama server (wajib, case-insensitive) |

```json
{
  "success": true,
  "server": "Cloudwish",
  "embedUrl": "https://cloudwish.xyz/e/...",
  "extracted": true,
  "streams": [
    { "type": "hls", "src": "https://cdn.../index-f1-v1-a1.m3u8", "quality": "480p", "resolution": "852x480" },
    { "type": "hls", "src": "https://cdn.../index-f2-v1-a1.m3u8", "quality": "720p", "resolution": "1280x720" },
    { "type": "hls", "src": "https://cdn.../index-f3-v1-a1.m3u8", "quality": "1080p", "resolution": "1920x1080" }
  ]
}
```

---

### `GET /api/stream/play`
**Extract + fetch + proxy m3u8 dalam satu request.** Dipakai oleh frontend — menghindari race condition token CDN expire antara extract → client → CDN.

| Parameter | Keterangan |
|-----------|-----------|
| `?url` | URL video `javhd.today` (wajib) |
| `?server` | Nama server (wajib) |
| `?quality` | `1080p` `720p` `480p` `auto` (default: tertinggi) |

Response: m3u8 playlist dengan segment URL yang sudah di-rewrite ke `/api/hlsproxy`.

---

### `GET /api/hlsproxy`
Proxy CDN segment untuk menghindari CORS. Dipakai internal oleh ArtPlayer/HLS.js.

| Parameter | Keterangan |
|-----------|-----------|
| `?url` | CDN URL di-encode base64url |

---

## Alur Streaming (Frontend)

```
1. GET /api/stream?url=<video_url>
   → dapat daftar server + canExtract flag

2. User pilih server

3. GET /api/stream/play?url=<video_url>&server=<server>&quality=auto
   → backend extract + fetch m3u8 dari CDN
   → rewrite segment URLs ke /api/hlsproxy
   → return m3u8 ke ArtPlayer

4. ArtPlayer/HLS.js fetch segments via /api/hlsproxy
   → backend proxy request ke CDN
   → return binary .ts ke browser
```

Server `canExtract: false` (Streamtape, STserver, dll) diputar via iframe embed langsung.

---

## Error Response

```json
{
  "success": false,
  "error": { "code": "NOT_FOUND", "message": "Data tidak ditemukan" }
}
```

| HTTP | Code | Kondisi |
|------|------|---------|
| 400 | `BAD_REQUEST` | Parameter invalid / kosong |
| 404 | `NOT_FOUND` | Data/endpoint tidak ditemukan |
| 429 | `RATE_LIMITED` | Target website rate-limit |
| 500 | `INTERNAL_ERROR` | Server error |
| 502 | `UPSTREAM_ERROR` | Target website gagal diakses |

---

## Catatan Teknis

- **Cloudflare** — target website memakai Cloudflare. HTTP client mengirim header browser lengkap (`User-Agent`, `Sec-Ch-Ua`, `Sec-Fetch-*`).
- **ISP Blocking** — beberapa ISP redirect ke SafeSurf. `NODE_TLS_REJECT_UNAUTHORIZED=0` untuk relax TLS.
- **Stream token** — token CDN expire dalam hitungan detik. `/api/stream/play` extract dan proxy m3u8 server-side agar token tidak expire di tangan client.
- **Maxcloud & Pmate** — kedua server ini pakai CDN `plauymito.live` yang sama. Maxcloud punya multiple source (FIRST + json=1 loop), Pmate pakai POST `/api/s` dengan filecode dari embed URL.
- **Multi-quality** — Cloudwish/Mycloudz punya HLS master playlist dengan 3 kualitas. Myserver/BpServer decode segment URL untuk construct quality variants. Maxcloud/Pmate punya HLS master dengan format `.txt` extension.
- **Server-side HLS rewrite** — semua segment URL di-rewrite ke `/api/hlsproxy` agar CORS tidak jadi masalah di browser.
