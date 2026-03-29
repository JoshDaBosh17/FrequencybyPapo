"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { HomeSuggestion } from "@/lib/types";

export type GlobalPlayerTrack = Pick<
  HomeSuggestion,
  | "artist"
  | "title"
  | "videoId"
  | "thumbnail"
  | "channelRole"
  | "source"
  | "intentKey"
  | "artistSeed"
  | "genreSeed"
  | "discoveryMode"
  | "recommendationPath"
> & {
  queueContext: {
    source: "home" | "compare" | "recommendation";
  };
};

type GlobalPlayerContextValue = {
  currentTrack: GlobalPlayerTrack | null;
  currentVideoId: string | null;
  isPlaying: boolean;
  currentTime: number;
  minimized: boolean;
  setTrack: (
    track: GlobalPlayerTrack,
    options?: { autoplay?: boolean; minimized?: boolean },
  ) => void;
  play: () => void;
  pause: () => void;
  setCurrentTime: (nextTime: number) => void;
  setMinimized: (nextMinimized: boolean) => void;
};

const GlobalPlayerContext = createContext<GlobalPlayerContextValue | null>(null);

function logGlobalPlayerEvent(
  event:
    | "global_player_initialized"
    | "global_player_track_set"
    | "global_player_tab_switch_preserved"
    | "global_player_remount_blocked",
  payload?: Record<string, unknown>,
) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.log("[frequency][global-player]", {
    event,
    ...payload,
  });
}

export function toGlobalPlayerTrack(
  suggestion: HomeSuggestion,
  source: GlobalPlayerTrack["queueContext"]["source"],
): GlobalPlayerTrack {
  return {
    artist: suggestion.artist,
    title: suggestion.title,
    videoId: suggestion.videoId,
    thumbnail: suggestion.thumbnail,
    channelRole: suggestion.channelRole,
    source: suggestion.source,
    intentKey: suggestion.intentKey ?? undefined,
    artistSeed: suggestion.artistSeed ?? undefined,
    genreSeed: suggestion.genreSeed ?? undefined,
    discoveryMode: suggestion.discoveryMode ?? undefined,
    recommendationPath: suggestion.recommendationPath,
    queueContext: {
      source,
    },
  };
}

export function GlobalPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<GlobalPlayerTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [minimized, setMinimized] = useState(true);

  const setTrack = useCallback(
    (track: GlobalPlayerTrack, options?: { autoplay?: boolean; minimized?: boolean }) => {
      setCurrentTrack((existingTrack) => {
        if (existingTrack?.videoId === track.videoId) {
          logGlobalPlayerEvent("global_player_remount_blocked", {
            videoId: track.videoId,
            artist: track.artist,
            title: track.title,
          });
          return {
            ...existingTrack,
            ...track,
          };
        }

        return track;
      });
      setIsPlaying(options?.autoplay ?? true);
      setCurrentTime(0);
      setMinimized(options?.minimized ?? false);
      logGlobalPlayerEvent("global_player_track_set", {
        videoId: track.videoId,
        artist: track.artist,
        title: track.title,
        autoplay: options?.autoplay ?? true,
      });
    },
    [],
  );

  const play = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleSetCurrentTime = useCallback((nextTime: number) => {
    setCurrentTime(nextTime);
  }, []);

  const handleSetMinimized = useCallback((nextMinimized: boolean) => {
    setMinimized(nextMinimized);
  }, []);

  const value = useMemo(
    () => ({
      currentTrack,
      currentVideoId: currentTrack?.videoId ?? null,
      isPlaying,
      currentTime,
      minimized,
      setTrack,
      play,
      pause,
      setCurrentTime: handleSetCurrentTime,
      setMinimized: handleSetMinimized,
    }),
    [currentTime, currentTrack, handleSetCurrentTime, handleSetMinimized, isPlaying, minimized, pause, play, setTrack],
  );

  useEffect(() => {
    logGlobalPlayerEvent("global_player_initialized");
  }, []);

  return <GlobalPlayerContext.Provider value={value}>{children}</GlobalPlayerContext.Provider>;
}

export function useGlobalPlayer() {
  const context = useContext(GlobalPlayerContext);

  if (!context) {
    throw new Error("useGlobalPlayer must be used within a GlobalPlayerProvider");
  }

  return context;
}
