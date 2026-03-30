"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

import type {
  HomeRecommendationItem,
  HomeRecommendationRequest,
} from "@/lib/frequency/home-recommendations";
import { buildHomeRecommendationCacheKey } from "@/lib/frequency/home-recommendations";
import { getGenreColor, withAlpha } from "@/lib/frequency/genre-colors";
import type { GenreProfileItem } from "@/lib/types";
import type { ListenableSongItem } from "./listen-on-modal";

type HomeYouMightLikeProps = {
  favoriteArtists: string[];
  genreProfile: GenreProfileItem[];
  recentArtists: string[];
  recentGenres: string[];
  recentSongs: Array<{ artist: string; title: string }>;
  uid: string | null;
  scope?: string;
  title?: string;
  subtitle?: string;
  emptyMessage?: string;
  onEditArtists?: () => void;
  onSelectRecommendation: (item: ListenableSongItem) => void;
};

type RecommendationResponse = {
  recommendations?: HomeRecommendationItem[];
  error?: string;
};

function normalizeText(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, " ") || null;
}

function mapRecommendationToListenable(item: HomeRecommendationItem): ListenableSongItem {
  return {
    ageLabel: "Recommended now",
    artist: item.artist,
    comment: null,
    contextLabel: "You Might Like",
    links: item.links,
    title: item.title,
    uploadedBy: {
      displayName: "Frequency",
    },
  };
}

export function HomeYouMightLike({
  favoriteArtists,
  genreProfile,
  recentArtists,
  recentGenres,
  recentSongs,
  uid,
  scope = "home",
  title = "You Might Like",
  subtitle = "A small set of songs held steady until you refresh it.",
  emptyMessage = "Add a few artists or drop more songs into your rooms to unlock recommendations here.",
  onEditArtists,
  onSelectRecommendation,
}: HomeYouMightLikeProps) {
  const [items, setItems] = useState<HomeRecommendationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheKey = useMemo(
    () =>
      buildHomeRecommendationCacheKey({
        favoriteArtists,
        genreProfile,
        recentArtists,
        recentGenres,
        scope,
        uid,
      }),
    [favoriteArtists, genreProfile, recentArtists, recentGenres, scope, uid],
  );
  const latestRequestKeyRef = useRef<string | null>(null);
  const canRecommend = Boolean(favoriteArtists.length || recentArtists.length);

  const loadRecommendations = useCallback(
    async (refreshToken?: string) => {
      if (!canRecommend) {
        setItems([]);
        setError(null);
        return;
      }

      const requestKey = `${cacheKey}:${refreshToken ?? "stable"}`;
      latestRequestKeyRef.current = requestKey;
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/home/recommendations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            exclude: recentSongs,
            favoriteArtists,
            genreProfile,
            limit: 4,
            recentArtists,
            recentGenres,
            refreshToken: refreshToken ?? null,
          } satisfies HomeRecommendationRequest),
        });
        const payload = (await response.json()) as RecommendationResponse;

        if (!response.ok) {
          throw new Error(payload.error ?? "Could not load recommendations right now.");
        }

        if (latestRequestKeyRef.current !== requestKey) {
          return;
        }

        const nextItems = payload.recommendations ?? [];
        setItems(nextItems);
        localStorage.setItem(cacheKey, JSON.stringify(nextItems));
      } catch (requestError) {
        if (latestRequestKeyRef.current !== requestKey) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Could not load recommendations right now.",
        );
      } finally {
        if (latestRequestKeyRef.current === requestKey) {
          setLoading(false);
        }
      }
    },
    [
      cacheKey,
      canRecommend,
      favoriteArtists,
      genreProfile,
      recentArtists,
      recentGenres,
      recentSongs,
    ],
  );

  useEffect(() => {
    if (!canRecommend) {
      setItems([]);
      setError(null);
      return;
    }

    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      try {
        const parsed = JSON.parse(cached) as HomeRecommendationItem[];
        if (Array.isArray(parsed) && parsed.length) {
          setItems(parsed);
          setError(null);
          return;
        }
      } catch {
        localStorage.removeItem(cacheKey);
      }
    }

    void loadRecommendations();
  }, [cacheKey, canRecommend, loadRecommendations]);

  return (
    <section className="section-haze rounded-[30px] border border-[rgba(255,255,255,0.06)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_14px_34px_rgba(0,0,0,0.12)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-[var(--text)]">
            {title}
          </h2>
          <p className="max-w-[28rem] text-[13px] leading-5 text-[var(--text-soft)]">
            {subtitle}
          </p>
        </div>

        <button
          className="button-secondary inline-flex min-h-10 shrink-0 items-center gap-2 self-start rounded-full px-3.5 text-xs font-medium disabled:opacity-70"
          disabled={loading || !canRecommend}
          onClick={() => void loadRecommendations(String(Date.now()))}
          type="button"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {!canRecommend ? (
        <div className="mt-5 rounded-[24px] border border-[var(--line)] bg-[rgba(13,16,24,0.6)] px-4 py-[18px]">
          <p className="text-[14px] leading-6 text-[var(--text-soft)]">
            {emptyMessage}
          </p>
          {onEditArtists ? (
            <button
              className="button-secondary mt-4 min-h-10 rounded-full px-3.5 text-sm font-medium"
              onClick={onEditArtists}
              type="button"
            >
              Add artists
            </button>
          ) : null}
        </div>
      ) : items.length ? (
        <div className="-mx-1 mt-5 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-full gap-3 px-1">
            {items.map((item) => {
              const accent = getGenreColor(item.primaryGenre ?? "frequency");
              const artist = normalizeText(item.artist) ?? "Unknown artist";

              return (
                <button
                  key={item.id}
                  className="group relative min-w-[184px] flex-1 rounded-[24px] border border-[var(--line)] bg-[rgba(12,15,23,0.78)] px-4 py-[18px] text-left transition hover:border-[var(--line-strong)] hover:bg-[rgba(15,19,29,0.9)] sm:min-w-[196px]"
                  onClick={() => onSelectRecommendation(mapRecommendationToListenable(item))}
                  type="button"
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-4 top-0 h-px"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${withAlpha(
                        accent,
                        0.9,
                      )}, transparent)`,
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: accent, boxShadow: `0 0 16px ${withAlpha(accent, 0.5)}` }}
                    />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-faint)]">
                      {item.primaryGenre ?? "frequency"}
                    </span>
                  </div>
                  <div className="mt-3.5 space-y-1.5">
                    <p className="line-clamp-2 text-[15px] font-semibold leading-[1.35] tracking-[-0.02em] text-[var(--text)]">
                      {item.title}
                    </p>
                    <p className="line-clamp-1 text-[13px] text-[var(--text-soft)]">{artist}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-[24px] border border-[var(--line)] bg-[rgba(13,16,24,0.6)] px-4 py-[18px]">
          <p className="text-[14px] leading-6 text-[var(--text-soft)]">
            {loading
              ? "Pulling a fresh set from the artists and genres around your frequency."
              : error ?? "No recommendations are ready yet."}
          </p>
        </div>
      )}
    </section>
  );
}
