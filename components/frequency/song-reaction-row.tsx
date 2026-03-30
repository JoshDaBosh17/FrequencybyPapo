"use client";

import {
  SONG_REACTION_OPTIONS,
  buildSongReactionKey,
  getSongReactionCount,
} from "@/lib/frequency/song-reactions";
import type { RoomShareReactionKind, RoomShareReactions } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SongReactionRow({
  className,
  itemId,
  pendingReactionKey,
  reactionUserId,
  reactions,
  roomId,
  onToggleReaction,
}: {
  className?: string;
  itemId: string;
  pendingReactionKey?: string | null;
  reactionUserId?: string | null;
  reactions: RoomShareReactions | null | undefined;
  roomId: string;
  onToggleReaction?: (reaction: RoomShareReactionKind) => void;
}) {
  return (
    <div className={cn("grid grid-cols-3 gap-1.5", className)}>
      {SONG_REACTION_OPTIONS.map((reaction) => {
        const count = getSongReactionCount(reactions, reaction.id);
        const reacted = Boolean(
          reactionUserId && reactions?.[reaction.id]?.includes(reactionUserId),
        );
        const reactionKey = buildSongReactionKey(roomId, itemId, reaction.id);

        return (
          <button
            key={reaction.id}
            aria-label={`${reaction.label} reaction`}
            aria-pressed={reacted}
            className={cn(
              "inline-flex h-7 min-w-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-1.5 text-[10px] font-medium transition",
              reacted
                ? "border-white/20 bg-white/[0.12] text-[var(--text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                : "border-white/10 bg-white/[0.04] text-[var(--text-soft)] hover:border-white/16 hover:bg-white/[0.08] hover:text-[var(--text)]",
            )}
            disabled={
              !onToggleReaction ||
              !reactionUserId ||
              pendingReactionKey === reactionKey
            }
            onClick={(event) => {
              event.stopPropagation();
              onToggleReaction?.(reaction.id);
            }}
            type="button"
          >
            <span className="shrink-0 leading-none">{reaction.emoji}</span>
            {count ? (
              <span className="min-w-0 truncate text-[9px] font-semibold tabular-nums text-[var(--text-faint)]">
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
