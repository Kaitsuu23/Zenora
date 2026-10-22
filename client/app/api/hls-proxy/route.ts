/**
 * HLS Proxy — forwards HLS .m3u8 and .ts requests server-side
 * to bypass browser CORS restrictions.
 *
 * The key insight: CDN tokens expire fast, so this proxy must fetch
 * the content from CDN immediately (no caching), while still serving
 * the browser which would get CORS errors directly.
 *
 * Usage: /api/hls-proxy?url=<base64_encoded_url>
 * The URL is base64 encoded to avoid issues with special chars in query strings.
 */

import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOSTS = [
  "premilkyway.com",
  "acek-cdn.com",
  "cdn-centaurus.com",
  "f4scdn.com",
  "97bf1.com",
  "dramiyos-cdn.com",
  "javhdz.today",
  "savedvids.com",
  "plauymito.live",   // Maxcloud/playmate CDN
];

function isAllowed(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return ALLOWED_HOSTS.some((h) => host.endsWith(h));
  } catch { return false; }
}

function rewriteM3u8(content: string, baseUrl: string): string {
  const urlObj  = new URL(baseUrl);
  const origin  = urlObj.origin;
  const base    = baseUrl.substring(0, baseUrl.lastIndexOf("/") + 1);
  const proxyBase = "/api/hls-proxy";

  function resolveUrl(uri: string): string {
    if (uri.startsWith("http")) return uri;
    if (uri.startsWith("/"))    return origin + uri;
    return base + uri;
  }

  return content.split("\n").map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return line;

    // Rewrite URI= attributes in tag lines
    if (trimmed.startsWith("#")) {
      return line.replace(/URI="([^"]+)"/g, (_, uri) => {
        const abs = resolveUrl(uri);
        if (!isAllowed(abs)) return `URI="${uri}"`;
        const encoded = Buffer.from(abs).toString("base64url");
        return `URI="${proxyBase}?url=${encoded}"`;
      });
    }

    // Segment URL
    const abs = resolveUrl(trimmed);
    if (!isAllowed(abs)) return abs;  // absolutize but don't proxy
    const encoded = Buffer.from(abs).toString("base64url");
    return `${proxyBase}?url=${encoded}`;
  }).join("\n");
}

export async function GET(request: NextRequest) {
  const rawParam = request.nextUrl.searchParams.get("url");
  if (!rawParam) return new NextResponse("Missing url", { status: 400 });

  let targetUrl: string;
  try {
    // Try base64url decode first, fall back to plain URL
    try {
      targetUrl = Buffer.from(rawParam, "base64url").toString("utf-8");
      new URL(targetUrl); // validate
    } catch {
      targetUrl = decodeURIComponent(rawParam);
      new URL(targetUrl);
    }
  } catch {
    return new NextResponse("Invalid url", { status: 400 });
  }

  if (!isAllowed(targetUrl)) {
    return new NextResponse("Host not allowed", { status: 403 });
  }

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "*/*",
        "Accept-Encoding": "gzip, deflate, br",
        // Provide referer hints for CDNs that check it
        "Referer": "https://stream3.javhdz.today/",
        "Origin": "https://stream3.javhdz.today",
      },
      cache: "no-store",
    });

    if (!upstream.ok) {
      return new NextResponse(`CDN error: ${upstream.status}`, { status: upstream.status });
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const isM3u8 = targetUrl.includes(".m3u8") || targetUrl.includes(".txt") || contentType.includes("mpegurl");

    if (isM3u8) {
      const text = await upstream.text();
      // Validate it's actually an HLS manifest before rewriting
      if (!text.includes("#EXTM3U") && !text.includes("#EXT-X-")) {
        const buffer = await upstream.clone().arrayBuffer().catch(() => Buffer.from(text));
        return new NextResponse(buffer, {
          headers: { "Content-Type": contentType, "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" },
        });
      }
      const rewritten = rewriteM3u8(text, targetUrl);
      return new NextResponse(rewritten, {
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-store, no-cache",
        },
      });
    }

    const buffer = await upstream.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("HLS proxy error:", err);
    return new NextResponse("Proxy fetch failed", { status: 502 });
  }
}
