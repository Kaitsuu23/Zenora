"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Artplayer from "artplayer";
import Hls from "hls.js";
import { AlertCircle, RefreshCw, Play } from "lucide-react";
import type { StreamServerItem, StreamSource, StreamExtractResponse } from "@/types/api";
import { api } from "@/lib/api";
import { ServerSelector } from "@/components/player/server-selector";
import { Button } from "@/components/ui/button";

function buildPlayUrl(videoUrl: string, serverName: string, quality: string): string {
  const params = new URLSearchParams({ url: videoUrl, server: serverName, quality });
  return `/api/proxy/stream/play?${params.toString()}`;
}

interface VideoPlayerProps {
  videoUrl: string;
  videoId: string;
  poster?: string;
}

export function VideoPlayer({ videoUrl, poster }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<Artplayer | null>(null);

  // Server state
  const [servers, setServers] = useState<StreamServerItem[]>([]);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [loadingServers, setLoadingServers] = useState(true);

  // Extract / stream state
  const [extracting, setExtracting] = useState(false);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Track which server is currently being extracted to cancel stale requests
  const currentExtractServerRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const serversRef = useRef<StreamServerItem[]>([]);

  useEffect(() => {
    serversRef.current = servers;
  }, [servers]);

  // ─── Destroy ArtPlayer instance ─────────────────────────────────────────────
  const destroyArt = useCallback(() => {
    const art = artRef.current;
    if (!art) return;

    try { art.pause(); } catch {}

    const hls = (art as unknown as { hls?: Hls }).hls;
    if (hls) {
      try { hls.stopLoad(); hls.detachMedia(); hls.destroy(); } catch {}
      (art as unknown as { hls?: Hls }).hls = undefined;
    }

    try { art.destroy(false); } catch {}
    artRef.current = null;
  }, []);

  // ─── Mount ArtPlayer with HLS ────────────────────────────────────────────────
  const mountArt = useCallback(
    (streams: StreamSource[], serverName: string) => {
      if (!containerRef.current) return;
      destroyArt();

      const sorted = [...streams].sort((a, b) => {
        const n = (q: string) => parseInt(q.replace(/\D/g, ""), 10) || 0;
        return n(b.quality) - n(a.quality);
      });

      const qualityList =
        sorted.length > 1
          ? sorted.map((s, i) => ({
              default: i === 0,
              html: s.quality.toUpperCase(),
              url:
                s.type === "hls"
                  ? buildPlayUrl(videoUrl, serverName, s.quality)
                  : s.src,
            }))
          : undefined;

      const defaultStream = sorted[0];
      const defaultUrl =
        defaultStream.type === "hls"
          ? buildPlayUrl(videoUrl, serverName, defaultStream.quality)
          : defaultStream.src;

      const art = new Artplayer({
        container: containerRef.current,
        url: defaultUrl,
        poster: poster || "",
        type: defaultStream.type === "hls" ? "m3u8" : "video/mp4",
        autoplay: true,
        pip: true,
        autoSize: true,
        autoMini: false,
        screenshot: false,
        setting: true,
        loop: false,
        flip: false,
        playbackRate: true,
        aspectRatio: false,
        fullscreen: true,
        fullscreenWeb: false,
        subtitleOffset: false,
        miniProgressBar: true,
        mutex: true,
        backdrop: true,
        playsInline: true,
        autoPlayback: true,
        autoOrientation: true,
        airplay: true,
        theme: "#ffffff",
        lang: "en",
        hotkey: false, // Disable built-in hotkeys — we handle them manually below
        ...(qualityList ? { quality: qualityList } : {}),
        customType: {
          m3u8: (video: HTMLVideoElement, url: string, art: Artplayer) => {
            if (Hls.isSupported()) {
              if ((art as unknown as { hls?: Hls }).hls) {
                (art as unknown as { hls: Hls }).hls.destroy();
              }
              const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
              hls.loadSource(url);
              hls.attachMedia(video);
              (art as unknown as { hls: Hls }).hls = hls;

              hls.on(Hls.Events.ERROR, (_e, data) => {
                if (data.fatal) {
                  if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                    hls.startLoad();
                  } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                    hls.recoverMediaError();
                  } else {
                    hls.destroy();
                  }
                }
              });
            } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
              video.src = url;
            }
          },
        },
      });

      artRef.current = art;

      // ── Mobile: single tap pada video = play/pause ─────────────────────────
      if (window.matchMedia("(pointer: coarse)").matches) {
        const $player = art.template.$player;

        // Area yang tidak boleh ikut ter-handle (kontrol, menu, dll.)
        const IGNORE =
          ".art-bottom, .art-setting, .art-contextmenus, .art-info, .art-layer-lock, .art-control";

        const onTap = (e: Event) => {
          const target = e.target as HTMLElement;
          if (target.closest(IGNORE)) return;
          e.stopPropagation(); // cegah handler bawaan ArtPlayer (tap = tampil/sembunyi kontrol)
          if (e.type === "click") art.toggle();
        };

        // capture = true supaya jalan lebih dulu dari handler bawaan
        $player.addEventListener("click", onTap, true);
        $player.addEventListener("dblclick", onTap, true); // dblclick bawaan juga ikut dicegah
        art.on("destroy", () => {
          $player.removeEventListener("click", onTap, true);
          $player.removeEventListener("dblclick", onTap, true);
        });
      }

      // ── Custom keyboard shortcuts ──────────────────────────────────────────
      const onKeyDown = (e: KeyboardEvent) => {
        // Ignore if user is typing in an input or contenteditable
        const target = e.target as HTMLElement;
        const tag = target?.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          target?.isContentEditable
        ) return;
        if (!artRef.current) return;

        const a = artRef.current;
        switch (e.key) {
          case "f":
          case "F":                          // F — toggle fullscreen
            e.preventDefault();
            a.fullscreen = !a.fullscreen;
            break;
          case " ":                          // Space — play/pause
            e.preventDefault();
            e.stopPropagation();
            a.playing ? a.pause() : a.play();
            break;
          case "ArrowLeft":                  // ← — seek -5s
            e.preventDefault();
            a.currentTime = Math.max(0, a.currentTime - 5);
            break;
          case "ArrowRight":                 // → — seek +5s
            e.preventDefault();
            a.currentTime = Math.min(a.duration, a.currentTime + 5);
            break;
          case "ArrowUp":                    // ↑ — volume +10%
            e.preventDefault();
            a.volume = Math.min(1, a.volume + 0.1);
            break;
          case "ArrowDown":                  // ↓ — volume -10%
            e.preventDefault();
            a.volume = Math.max(0, a.volume - 0.1);
            break;
          case "m":
          case "M":                          // M — mute toggle
            e.preventDefault();
            a.muted = !a.muted;
            break;
        }
      };

      document.addEventListener("keydown", onKeyDown, { capture: true });
      art.on("destroy", () => document.removeEventListener("keydown", onKeyDown, { capture: true }));
    },
    [videoUrl, poster, destroyArt]
  );

  // ─── Fetch servers — do NOT auto-select ─────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    setLoadingServers(true);
    setErrorMsg(null);

    api
      .getStreams(videoUrl)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.servers?.length) {
          setServers(res.servers);
          // Do NOT auto-select or auto-extract — wait for user to pick a server
        } else {
          setErrorMsg("Gagal memuat daftar server video.");
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setErrorMsg(err.message || "Gagal menghubungkan ke server stream.");
      })
      .finally(() => {
        if (isMounted) setLoadingServers(false);
      });

    return () => {
      isMounted = false;
    };
  }, [videoUrl]);

  // ─── Extract & play ──────────────────────────────────────────────────────────
  const extractAndPlay = useCallback(
    async (serverName: string) => {
      // Abort any in-flight extraction immediately
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Mark this as the active extraction
      currentExtractServerRef.current = serverName;

      // ← Kill previous player immediately so old video/audio stops NOW
      destroyArt();

      setExtracting(true);
      setErrorMsg(null);

      try {
        const res: StreamExtractResponse = await api.extractStream(videoUrl, serverName);

        // Double-check: abort signal OR server changed while awaiting
        if (controller.signal.aborted || currentExtractServerRef.current !== serverName) return;

        if (res.success && res.streams?.length) {
          setIframeUrl(null);
          mountArt(res.streams, serverName);
        } else {
          throw new Error("Gagal mengekstrak URL stream dari server " + serverName);
        }
      } catch (err: unknown) {
        // Silently discard if aborted or stale
        if (controller.signal.aborted || currentExtractServerRef.current !== serverName) return;

        const msg = err instanceof Error ? err.message : "Gagal mengekstrak video stream";
        setErrorMsg(msg);
      } finally {
        // Only clear extracting state if this is still the active request
        if (!controller.signal.aborted && currentExtractServerRef.current === serverName) {
          setExtracting(false);
        }
      }
    },
    [videoUrl, mountArt, destroyArt]
  );

  const extractAndPlayRef = useRef(extractAndPlay);
  useEffect(() => {
    extractAndPlayRef.current = extractAndPlay;
  }, [extractAndPlay]);

  // ─── React to server selection (only when user explicitly picks one) ─────────
  useEffect(() => {
    if (!selectedServer) return;

    const serverData = serversRef.current.find(
      (s) => s.server.toLowerCase() === selectedServer.toLowerCase()
    );

    if (serverData && !serverData.canExtract) {
      // Non-extractable: abort any in-flight extraction and show iframe
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      currentExtractServerRef.current = null;
      destroyArt();
      setExtracting(false);
      setErrorMsg(null);
      setIframeUrl(serverData.embedUrl || null);
      return;
    }

    setIframeUrl(null);
    extractAndPlayRef.current(selectedServer);
  }, [selectedServer, destroyArt]);

  // ─── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      currentExtractServerRef.current = null;
      destroyArt();
    };
  }, [destroyArt]);

  return (
    <div className="w-full flex flex-col">
      {/* Video Viewport — `zenora-player` class is used by globals.css to compact ArtPlayer controls */}
      <div
        className="zenora-player relative w-full bg-black overflow-hidden border border-white/20 shadow-2xl isolate"
        style={{ aspectRatio: "16/9" }}
      >
        {iframeUrl ? (
          <iframe
            src={iframeUrl}
            className="h-full w-full"
            allowFullScreen
            allow="autoplay; encrypted-media; picture-in-picture"
            frameBorder="0"
            scrolling="no"
          />
        ) : (
          <div ref={containerRef} className="h-full w-full" />
        )}

        {/* Loading / Extracting Overlay */}
        {(loadingServers || extracting) && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="relative mb-4">
              <div className="h-12 w-12 border-2 border-white/20 border-t-white animate-spin" />
            </div>
            <p className="font-mono text-xs tracking-widest uppercase text-white font-medium mb-1">
              {loadingServers
                ? "Memuat daftar server..."
                : `Mengekstrak Stream (${selectedServer || "Server"})...`}
            </p>
            <span className="font-mono text-[11px] text-neutral-400 tracking-wider">
              Mohon tunggu, proses ekstraksi token CDN memerlukan beberapa detik.
            </span>
          </div>
        )}

        {/* Idle state — servers loaded but no server chosen yet */}
        {!loadingServers && !extracting && !selectedServer && !errorMsg && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 text-center z-10">
            <Play className="h-10 w-10 text-white/40 mb-3" />
            <p className="font-mono text-xs tracking-widest uppercase text-neutral-400">
              Pilih server di bawah untuk mulai streaming
            </p>
          </div>
        )}

        {/* Error Overlay */}
        {errorMsg && !extracting && (
          <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="inline-flex h-10 w-10 items-center justify-center border border-white/20 bg-neutral-900 mb-3 text-white">
              <AlertCircle className="h-5 w-5" />
            </div>
            <h4 className="font-mono text-xs tracking-widest uppercase text-white font-medium mb-2">
              Streaming Terganggu
            </h4>
            <p className="font-mono text-xs text-neutral-400 max-w-md mb-6 leading-relaxed">
              {errorMsg}
            </p>
            {selectedServer && (
              <Button
                onClick={() => {
                  extractAndPlayRef.current(selectedServer);
                }}
                variant="default"
                size="default"
                className="gap-2 min-h-[44px]"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Coba Lagi</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Active server badge */}
      <div className="flex items-center py-3 border-b border-white/10">
        {iframeUrl ? (
          <span className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-neutral-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{selectedServer}</span>
            <span className="text-neutral-500">(IFRAME)</span>
          </span>
        ) : artRef.current ? (
          <span className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-neutral-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{selectedServer}</span>
            <span className="text-neutral-500">(HLS)</span>
          </span>
        ) : null}
      </div>

      {/* Server Selector */}
      <ServerSelector
        servers={servers}
        selectedServer={selectedServer}
        onSelectServer={(srv) => {
          setSelectedServer(srv);
        }}
        isLoading={extracting}
      />
    </div>
  );
}