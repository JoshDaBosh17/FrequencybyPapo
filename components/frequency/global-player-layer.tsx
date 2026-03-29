"use client";

import { Pause, Play, Maximize2, Minimize2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { useGlobalPlayer } from "@/components/providers/global-player-provider";
import { cn } from "@/lib/utils";

function buildPlayerUrl(videoId: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const url = new URL(`https://www.youtube-nocookie.com/embed/${videoId}`);
  url.searchParams.set("enablejsapi", "1");
  url.searchParams.set("playsinline", "1");
  url.searchParams.set("rel", "0");
  url.searchParams.set("modestbranding", "1");
  url.searchParams.set("autoplay", "1");
  url.searchParams.set("origin", origin);
  return url.toString();
}

export function GlobalPlayerLayer() {
  const pathname = usePathname();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [loadedVideoId, setLoadedVideoId] = useState<string | null>(null);
  const {
    currentTrack,
    currentVideoId,
    isPlaying,
    minimized,
    pause,
    play,
    setCurrentTime,
    setMinimized,
  } = useGlobalPlayer();

  const playerUrl = useMemo(() => (currentVideoId ? buildPlayerUrl(currentVideoId) : null), [currentVideoId]);
  const iframeLoaded = loadedVideoId === currentVideoId;

  useEffect(() => {
    if (!currentVideoId) {
      return;
    }

    if (process.env.NODE_ENV === "development") {
      console.log("[frequency][global-player]", {
        event: "global_player_tab_switch_preserved",
        pathname,
        videoId: currentVideoId,
        minimized,
      });
    }
  }, [currentVideoId, minimized, pathname]);

  useEffect(() => {
    if (!iframeLoaded || !iframeRef.current?.contentWindow) {
      return;
    }

    iframeRef.current.contentWindow.postMessage(
      JSON.stringify({
        event: "command",
        func: isPlaying ? "playVideo" : "pauseVideo",
        args: [],
      }),
      "*",
    );
  }, [iframeLoaded, isPlaying]);

  useEffect(() => {
    if (!currentVideoId || !isPlaying || !iframeLoaded || !iframeRef.current?.contentWindow) {
      return;
    }

    const interval = window.setInterval(() => {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({
          event: "command",
          func: "getCurrentTime",
          args: [],
        }),
        "*",
      );
    }, 4000);

    return () => {
      window.clearInterval(interval);
    };
  }, [currentVideoId, iframeLoaded, isPlaying]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (
        typeof event.origin === "string" &&
        !event.origin.includes("youtube") &&
        !event.origin.includes("youtube-nocookie")
      ) {
        return;
      }

      let payload: unknown = event.data;
      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload);
        } catch {
          return;
        }
      }

      if (
        payload &&
        typeof payload === "object" &&
        "event" in payload &&
        (payload as { event?: string }).event === "infoDelivery"
      ) {
        const info = (payload as { info?: { currentTime?: number } }).info;
        if (typeof info?.currentTime === "number") {
          setCurrentTime(info.currentTime);
        }
      }
    }

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [setCurrentTime]);

  if (!currentTrack || !currentVideoId || !playerUrl) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[5.4rem] z-20 px-4 transition-all duration-300">
      <div
        className={cn(
          "pointer-events-auto mx-auto rounded-[22px] border border-[var(--line)] bg-[rgba(10,13,20,0.88)] shadow-[0_12px_30px_rgba(0,0,0,0.3)] backdrop-blur-lg transition-all duration-300",
          minimized ? "max-w-[420px] px-3 py-2" : "max-w-[560px] px-3.5 py-2.5",
        )}
      >
        <div className="absolute h-0 w-0 overflow-hidden opacity-0 pointer-events-none">
          <div className="overflow-hidden bg-black">
            <iframe
              ref={iframeRef}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-px w-px border-0"
              key={currentVideoId}
              onLoad={() => setLoadedVideoId(currentVideoId)}
              src={playerUrl}
              title={currentTrack.title}
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold tracking-[-0.03em] text-[var(--text)]">
              {currentTrack.title}
            </p>
            <p className="truncate text-[12px] text-[var(--text-soft)]">{currentTrack.artist}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              aria-label={isPlaying ? "Pause playback" : "Resume playback"}
              className="button-primary inline-flex min-h-9 min-w-9 items-center justify-center rounded-full"
              onClick={() => (isPlaying ? pause() : play())}
              type="button"
            >
              {isPlaying ? <Pause className="size-3.5 fill-current" /> : <Play className="size-3.5 fill-current" />}
            </button>
            <button
              aria-label={minimized ? "Expand mini player" : "Collapse mini player"}
              className="button-secondary inline-flex min-h-9 min-w-9 items-center justify-center rounded-full"
              onClick={() => setMinimized(!minimized)}
              type="button"
            >
              {minimized ? <Maximize2 className="size-3.5" /> : <Minimize2 className="size-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
