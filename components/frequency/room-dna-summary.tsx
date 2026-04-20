"use client";

import { useMemo } from "react";

import { getGenreColor, withAlpha } from "@/lib/frequency/genre-colors";
import { getSongReactionTotal } from "@/lib/frequency/song-reactions";
import type { SongActivityItem } from "@/lib/frequency/song-activity";
import { getAvatarTone } from "@/lib/utils";

type SummaryCard = {
  accentColor: string;
  detail: string;
  label: string;
  value: string;
};

function normalizeText(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, " ") || null;
}

function buildPlaceholderCard(label: string): SummaryCard {
  return {
    accentColor: "#8bb9d8",
    detail: "Share a few more songs to unlock this signal.",
    label,
    value: "Not enough activity yet",
  };
}

export function RoomDnaSummary({ items }: { items: SongActivityItem[] }) {
  const cards = useMemo(() => {
    const genreStats = new Map<
      string,
      {
        count: number;
        contributors: Set<string>;
        label: string;
      }
    >();
    const artistContributorStats = new Map<
      string,
      {
        contributors: Set<string>;
        label: string;
      }
    >();
    const personStats = new Map<
      string,
      {
        count: number;
        displayName: string;
        reactionTotal: number;
        uid: string;
      }
    >();

    for (const item of items) {
      const uid = item.uploadedBy.uid.trim();
      const displayName = normalizeText(item.uploadedBy.displayName) ?? "Someone";
      const artist = normalizeText(item.artist);
      const genre = normalizeText(item.primaryGenre);
      const personEntry = personStats.get(uid) ?? {
        count: 0,
        displayName,
        reactionTotal: 0,
        uid,
      };

      personEntry.count += 1;
      personEntry.reactionTotal += getSongReactionTotal(item.reactions);
      personStats.set(uid, personEntry);

      if (artist) {
        const artistKey = artist.toLowerCase();
        const artistEntry = artistContributorStats.get(artistKey) ?? {
          contributors: new Set<string>(),
          label: artist,
        };

        artistEntry.contributors.add(uid);
        artistContributorStats.set(artistKey, artistEntry);
      }

      if (genre) {
        const genreKey = genre.toLowerCase();
        const genreEntry = genreStats.get(genreKey) ?? {
          count: 0,
          contributors: new Set<string>(),
          label: genre,
        };

        genreEntry.count += 1;
        genreEntry.contributors.add(uid);
        genreStats.set(genreKey, genreEntry);
      }
    }

    const mostConsistentGenre =
      [...genreStats.values()].sort((left, right) => {
        const contributorDelta =
          right.contributors.size - left.contributors.size;

        if (contributorDelta !== 0) {
          return contributorDelta;
        }

        const countDelta = right.count - left.count;

        if (countDelta !== 0) {
          return countDelta;
        }

        return left.label.localeCompare(right.label);
      })[0] ?? null;

    const mostInfluentialPerson =
      [...personStats.values()].sort((left, right) => {
        const contributionDelta = right.count - left.count;

        if (contributionDelta !== 0) {
          return contributionDelta;
        }

        const reactionDelta = right.reactionTotal - left.reactionTotal;

        if (reactionDelta !== 0) {
          return reactionDelta;
        }

        return left.displayName.localeCompare(right.displayName);
      })[0] ?? null;

    const mostUniquePerson = (() => {
      if (personStats.size < 2) {
        return null;
      }

      const bestByPerson = new Map<
        string,
        {
          detail: string;
          displayName: string;
          score: number;
          uid: string;
        }
      >();

      for (const item of items) {
        const uid = item.uploadedBy.uid.trim();
        const displayName = normalizeText(item.uploadedBy.displayName) ?? "Someone";
        const artist = normalizeText(item.artist);
        const genre = normalizeText(item.primaryGenre);
        const artistContributorCount = artist
          ? artistContributorStats.get(artist.toLowerCase())?.contributors.size ?? 0
          : 0;
        const genreContributorCount = genre
          ? genreStats.get(genre.toLowerCase())?.contributors.size ?? 0
          : 0;

        if (!artistContributorCount && !genreContributorCount) {
          continue;
        }

        let score = 0;

        if (artistContributorCount) {
          score += 1 / artistContributorCount;

          if (artistContributorCount === 1) {
            score += 1.35;
          }
        }

        if (genreContributorCount) {
          score += 0.8 / genreContributorCount;

          if (genreContributorCount === 1) {
            score += 1.1;
          }
        }

        let detail = "Distinct taste signal in the room.";

        if (artist && genre && artistContributorCount === 1 && genreContributorCount === 1) {
          detail = `Only person with ${artist} in ${genre}.`;
        } else if (genre && genreContributorCount === 1) {
          detail = `Only person steering the room toward ${genre}.`;
        } else if (artist && artistContributorCount === 1) {
          detail = `Only person who brought in ${artist}.`;
        } else if (genre) {
          detail = `${genre} shows up less often across the room.`;
        } else if (artist) {
          detail = `${artist} stands apart from the rest of the room.`;
        }

        const currentBest = bestByPerson.get(uid);

        if (!currentBest || score > currentBest.score) {
          bestByPerson.set(uid, {
            detail,
            displayName,
            score,
            uid,
          });
        }
      }

      return (
        [...bestByPerson.values()].sort((left, right) => {
          const scoreDelta = right.score - left.score;

          if (scoreDelta !== 0) {
            return scoreDelta;
          }

          const contributionDelta =
            (personStats.get(left.uid)?.count ?? 0) -
            (personStats.get(right.uid)?.count ?? 0);

          if (contributionDelta !== 0) {
            return contributionDelta;
          }

          return left.displayName.localeCompare(right.displayName);
        })[0] ?? null
      );
    })();

    return [
      mostConsistentGenre
        ? {
            accentColor: getGenreColor(mostConsistentGenre.label),
            detail: `Shows up in ${mostConsistentGenre.count} song${
              mostConsistentGenre.count === 1 ? "" : "s"
            } from ${mostConsistentGenre.contributors.size} contributor${
              mostConsistentGenre.contributors.size === 1 ? "" : "s"
            }.`,
            label: "Most consistent genre",
            value: mostConsistentGenre.label,
          }
        : buildPlaceholderCard("Most consistent genre"),
      mostInfluentialPerson
        ? {
            accentColor: getAvatarTone(mostInfluentialPerson.uid),
            detail: `${mostInfluentialPerson.count} song contribution${
              mostInfluentialPerson.count === 1 ? "" : "s"
            } so far.`,
            label: "Most influential person",
            value: mostInfluentialPerson.displayName,
          }
        : buildPlaceholderCard("Most influential person"),
      mostUniquePerson
        ? {
            accentColor: getAvatarTone(`${mostUniquePerson.uid}:unique`),
            detail: mostUniquePerson.detail,
            label: "Most unique",
            value: mostUniquePerson.displayName,
          }
        : buildPlaceholderCard("Most unique"),
    ] satisfies SummaryCard[];
  }, [items]);

  return (
    <section className="space-y-4">
      <div className="space-y-1.5">
        <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-[var(--text)]">
          DNA Summary
        </h2>
        <p className="text-[14px] leading-6 text-[var(--text-soft)]">
          A quick read on the patterns shaping this room right now.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.label}
            className="relative overflow-hidden rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(19,23,33,0.82),rgba(7,9,14,0.92))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
          >
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-px"
              style={{
                background: `linear-gradient(90deg, transparent, ${withAlpha(card.accentColor, 0.9)}, transparent)`,
              }}
            />
            <div
              aria-hidden="true"
              className="absolute -right-6 bottom-0 h-20 w-20 rounded-full blur-3xl"
              style={{
                background: `radial-gradient(circle, ${withAlpha(card.accentColor, 0.18)}, transparent 72%)`,
              }}
            />

            <div className="relative space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">
                {card.label}
              </p>
              <p className="text-[22px] font-semibold tracking-[-0.04em] text-[var(--text)]">
                {card.value}
              </p>
              <p className="max-w-[28ch] text-[13px] leading-5 text-[var(--text-soft)]">
                {card.detail}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
