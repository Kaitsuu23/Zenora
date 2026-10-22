import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.API_URL;
if (!API_BASE_URL) {
  throw new Error("API_URL environment variable is not set. Add it to your .env.local or Vercel project settings.");
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await context.params;
    const joinedPath = path.join("/");

    // Normalize target path so it starts with /api/
    const targetPath = joinedPath.startsWith("api/")
      ? `/${joinedPath}`
      : `/api/${joinedPath}`;

    const searchParams = request.nextUrl.searchParams.toString();
    const targetUrl = `${API_BASE_URL}${targetPath}${searchParams ? `?${searchParams}` : ""}`;

    // Never cache stream-related requests
    const isStream = joinedPath.includes("stream");
    const fetchOptions: RequestInit = isStream
      ? { cache: "no-store" }
      : { next: { revalidate: 60 } };

    const upstreamResponse = await fetch(targetUrl, {
      ...fetchOptions,
      headers: {
        Accept: "*/*",
      },
    });

    const contentType = upstreamResponse.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const isM3u8 =
      contentType.includes("mpegurl") ||
      contentType.includes("x-mpegurl") ||
      targetPath.includes("stream/play");

    if (!upstreamResponse.ok) {
      // Try to parse error as JSON
      const errData = await upstreamResponse.json().catch(() => null);
      const status = upstreamResponse.status;
      return NextResponse.json(
        {
          success: false,
          error: {
            code: errData?.error?.code || "UPSTREAM_ERROR",
            message: errData?.error?.message || `Upstream error ${status}`,
          },
        },
        { status }
      );
    }

    // For m3u8/HLS content, pass through as-is with correct headers
    if (isM3u8) {
      const buffer = await upstreamResponse.arrayBuffer();
      return new NextResponse(buffer, {
        status: upstreamResponse.status,
        headers: {
          "Content-Type": contentType || "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-store",
          // Pass through custom headers from backend
          ...(upstreamResponse.headers.get("x-stream-quality")
            ? { "X-Stream-Quality": upstreamResponse.headers.get("x-stream-quality")! }
            : {}),
          ...(upstreamResponse.headers.get("x-stream-server")
            ? { "X-Stream-Server": upstreamResponse.headers.get("x-stream-server")! }
            : {}),
        },
      });
    }

    // For binary/other content, pass through as buffer
    if (!isJson) {
      const buffer = await upstreamResponse.arrayBuffer();
      return new NextResponse(buffer, {
        status: upstreamResponse.status,
        headers: {
          "Content-Type": contentType,
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-store",
        },
      });
    }

    // JSON response
    const data = await upstreamResponse.json().catch(() => null);
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Terjadi gangguan saat memproses request.",
        },
      },
      { status: 500 }
    );
  }
}
