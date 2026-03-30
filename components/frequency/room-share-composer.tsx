"use client";

import { ArrowUpRight, Globe2, Lock, Music4, PlusCircle } from "lucide-react";
import { useState } from "react";

import { resolveArtistName } from "@/lib/client/artists";
import { resolveSongName } from "@/lib/client/songs";
import {
  buildArtistRoomShareDraft,
  buildLinkRoomShareDraft,
  buildSongRoomShareDraft,
  getRoomShareKindLabel,
  ROOM_SHARE_KIND_OPTIONS,
} from "@/lib/frequency/room-share";
import type { RoomShareKind } from "@/lib/types";
import { ArtistCorrectionModal } from "./artist-correction-modal";
import { SegmentedControl } from "./segmented-control";
import { SongCorrectionModal } from "./song-correction-modal";

type RoomShareSubmitDraft = {
  kind: RoomShareKind;
  title: string;
  subtitle?: string | null;
  url?: string | null;
  note?: string | null;
};

type ArtistCorrectionState = {
  open: boolean;
  originalArtist: string;
  canonicalArtist: string;
};

type SongCorrectionState = {
  open: boolean;
  originalTitle: string;
  originalArtist: string;
  canonicalTitle: string;
  canonicalArtist: string;
  note?: string | null;
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-faint)]">
      {children}
    </p>
  );
}

export function RoomShareComposer({
  channel,
  channelVibe,
  visibility,
  onSubmit,
  compact = false,
  showHeader = true,
}: {
  channel: string;
  channelVibe?: string | null;
  visibility: "personal" | "public";
  onSubmit: (draft: RoomShareSubmitDraft) => Promise<void>;
  compact?: boolean;
  showHeader?: boolean;
}) {
  const [kind, setKind] = useState<RoomShareKind>("song");
  const [songTitleInput, setSongTitleInput] = useState("");
  const [songArtistInput, setSongArtistInput] = useState("");
  const [songCommentInput, setSongCommentInput] = useState("");
  const [artistInput, setArtistInput] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const [linkCommentInput, setLinkCommentInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [artistCorrection, setArtistCorrection] = useState<ArtistCorrectionState | null>(null);
  const [songCorrection, setSongCorrection] = useState<SongCorrectionState | null>(null);

  function resetComposerForKind(submittedKind: RoomShareKind) {
    if (submittedKind === "song") {
      setSongTitleInput("");
      setSongArtistInput("");
      setSongCommentInput("");
      return;
    }

    if (submittedKind === "artist") {
      setArtistInput("");
      return;
    }

    setLinkInput("");
    setLinkCommentInput("");
  }

  async function submitDraft(draft: RoomShareSubmitDraft) {
    await onSubmit(draft);
    resetComposerForKind(draft.kind);
    setError(null);
  }

  async function validateAndBuildDraft() {
    if (kind === "song") {
      const trimmedTitle = songTitleInput.trim();
      const trimmedArtist = songArtistInput.trim();

      if (!trimmedTitle) {
        throw new Error("Add a song title.");
      }

      if (!trimmedArtist) {
        throw new Error("Add the artist.");
      }

      const resolution = await resolveSongName(trimmedTitle, trimmedArtist);

      if (resolution.shouldConfirm) {
        setSongCorrection({
          canonicalArtist: resolution.canonicalArtist,
          canonicalTitle: resolution.canonicalTitle,
          note: songCommentInput,
          open: true,
          originalArtist: trimmedArtist,
          originalTitle: trimmedTitle,
        });
        return null;
      }

      if (!resolution.exactMatch || !resolution.matched) {
        throw new Error("We couldn't verify that song. Check the title and artist.");
      }

      return buildSongRoomShareDraft({
        artist: resolution.canonicalArtist,
        note: songCommentInput,
        title: resolution.canonicalTitle,
      });
    }

    if (kind === "artist") {
      const trimmedArtist = artistInput.trim();

      if (!trimmedArtist) {
        throw new Error("Add an artist name.");
      }

      const resolution = await resolveArtistName(trimmedArtist);

      if (resolution.shouldConfirm) {
        setArtistCorrection({
          canonicalArtist: resolution.canonicalName,
          open: true,
          originalArtist: trimmedArtist,
        });
        return null;
      }

      if (!resolution.exactMatch || !resolution.matched) {
        throw new Error("We couldn't find that artist. Try a different spelling.");
      }

      return buildArtistRoomShareDraft({
        artist: resolution.canonicalName,
      });
    }

    return buildLinkRoomShareDraft({
      note: linkCommentInput,
      url: linkInput,
    });
  }

  async function handleSubmit(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    setPending(true);
    setError(null);

    try {
      const draft = await validateAndBuildDraft();
      if (!draft) {
        return;
      }

      await submitDraft(draft);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "That drop didn't save. Try again.",
      );
    } finally {
      setPending(false);
    }
  }

  async function handleArtistCorrectionConfirm() {
    if (!artistCorrection) {
      return;
    }

    setPending(true);
    setError(null);

    try {
      await submitDraft(
        buildArtistRoomShareDraft({
          artist: artistCorrection.canonicalArtist,
        }),
      );
      setArtistCorrection(null);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "That drop didn't save. Try again.",
      );
    } finally {
      setPending(false);
    }
  }

  async function handleSongCorrectionConfirm() {
    if (!songCorrection) {
      return;
    }

    setPending(true);
    setError(null);

    try {
      await submitDraft(
        buildSongRoomShareDraft({
          artist: songCorrection.canonicalArtist,
          note: songCorrection.note,
          title: songCorrection.canonicalTitle,
        }),
      );
      setSongCorrection(null);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "That drop didn't save. Try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <form className={compact ? "space-y-3" : "space-y-4"} onSubmit={(event) => void handleSubmit(event)}>
        {showHeader ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p
                className={
                  compact
                    ? "text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]"
                    : "text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]"
                }
              >
                Add music
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span
                className={
                  compact
                    ? "surface-pill inline-flex min-h-8 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-medium text-[var(--text-soft)]"
                    : "surface-pill inline-flex min-h-9 items-center gap-2 rounded-full px-3 text-[12px] font-medium text-[var(--text-soft)]"
                }
              >
                {visibility === "public" ? <Globe2 className="size-3.5" /> : <Lock className="size-3.5" />}
                {visibility === "public" ? "Shareable room" : "Private room"}
              </span>
              <span
                className={
                  compact
                    ? "surface-pill inline-flex min-h-8 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-medium text-[var(--text-soft)]"
                    : "surface-pill inline-flex min-h-9 items-center gap-2 rounded-full px-3 text-[12px] font-medium text-[var(--text-soft)]"
                }
              >
                <Music4 className="size-3.5" />
                #{channel}
              </span>
              {channelVibe ? (
                <span
                  className={
                    compact
                      ? "surface-pill inline-flex min-h-8 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-medium text-[var(--text-soft)]"
                      : "surface-pill inline-flex min-h-9 items-center gap-2 rounded-full px-3 text-[12px] font-medium text-[var(--text-soft)]"
                  }
                >
                  <ArrowUpRight className="size-3.5" />
                  {channelVibe}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        <SegmentedControl
          segments={ROOM_SHARE_KIND_OPTIONS}
          value={kind}
          onChange={(value) => {
            setKind(value);
            setError(null);
            setArtistCorrection(null);
            setSongCorrection(null);
          }}
        />

        {kind === "song" ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
              <div className="space-y-2">
                <FieldLabel>Song Title</FieldLabel>
                <input
                  className={
                    compact
                      ? "field-surface min-h-11 w-full rounded-[16px] px-4 text-[14px]"
                      : "field-surface min-h-12 w-full rounded-[18px] px-4 text-[15px]"
                  }
                  onChange={(event) => {
                    setSongTitleInput(event.target.value);
                    setError(null);
                  }}
                  value={songTitleInput}
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>Artist</FieldLabel>
                <input
                  className={
                    compact
                      ? "field-surface min-h-11 w-full rounded-[16px] px-4 text-[13px]"
                      : "field-surface min-h-12 w-full rounded-[18px] px-4 text-[14px]"
                  }
                  onChange={(event) => {
                    setSongArtistInput(event.target.value);
                    setError(null);
                  }}
                  value={songArtistInput}
                />
              </div>
            </div>
            <div className="space-y-2">
              <FieldLabel>Comment (optional)</FieldLabel>
              <textarea
                className={
                  compact
                    ? "field-surface min-h-[84px] w-full rounded-[16px] px-4 py-3 text-[13px] leading-5"
                    : "field-surface min-h-[92px] w-full rounded-[18px] px-4 py-3 text-[14px] leading-6"
                }
                onChange={(event) => {
                  setSongCommentInput(event.target.value);
                  setError(null);
                }}
                rows={3}
                value={songCommentInput}
              />
            </div>
            <div className="flex justify-end">
              <button
                className={
                  compact
                    ? "button-primary min-h-11 rounded-full px-4 text-[13px] font-medium disabled:opacity-70"
                    : "button-primary min-h-12 rounded-full px-5 text-[14px] font-medium disabled:opacity-70"
                }
                disabled={pending}
                type="submit"
              >
                <span className="inline-flex items-center gap-2">
                  <PlusCircle className="size-4" />
                  {pending ? "Adding" : `Add ${getRoomShareKindLabel(kind)}`}
                </span>
              </button>
            </div>
          </div>
        ) : null}

        {kind === "artist" ? (
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="space-y-2">
              <FieldLabel>Artist Name</FieldLabel>
              <input
                className={
                  compact
                    ? "field-surface min-h-11 w-full rounded-[16px] px-4 text-[14px]"
                    : "field-surface min-h-12 w-full rounded-[18px] px-4 text-[15px]"
                }
                onChange={(event) => {
                  setArtistInput(event.target.value);
                  setError(null);
                }}
                value={artistInput}
              />
            </div>
            <div className="space-y-2">
              <div aria-hidden="true" className="h-[18px]" />
              <button
                className={
                  compact
                    ? "button-primary min-h-11 w-full rounded-full px-4 text-[13px] font-medium disabled:opacity-70"
                    : "button-primary min-h-12 w-full rounded-full px-5 text-[14px] font-medium disabled:opacity-70"
                }
                disabled={pending}
                type="submit"
              >
                <span className="inline-flex items-center gap-2">
                  <PlusCircle className="size-4" />
                  {pending ? "Adding" : `Add ${getRoomShareKindLabel(kind)}`}
                </span>
              </button>
            </div>
          </div>
        ) : null}

        {kind === "link" ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <FieldLabel>Paste link</FieldLabel>
              <input
                className={
                  compact
                    ? "field-surface min-h-11 w-full rounded-[16px] px-4 text-[14px]"
                    : "field-surface min-h-12 w-full rounded-[18px] px-4 text-[15px]"
                }
                onChange={(event) => {
                  setLinkInput(event.target.value);
                  setError(null);
                }}
                value={linkInput}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Comment (optional)</FieldLabel>
              <textarea
                className={
                  compact
                    ? "field-surface min-h-[84px] w-full rounded-[16px] px-4 py-3 text-[13px] leading-5"
                    : "field-surface min-h-[92px] w-full rounded-[18px] px-4 py-3 text-[14px] leading-6"
                }
                onChange={(event) => {
                  setLinkCommentInput(event.target.value);
                  setError(null);
                }}
                rows={3}
                value={linkCommentInput}
              />
            </div>
            <div className="flex justify-end">
              <button
                className={
                  compact
                    ? "button-primary min-h-11 rounded-full px-4 text-[13px] font-medium disabled:opacity-70"
                    : "button-primary min-h-12 rounded-full px-5 text-[14px] font-medium disabled:opacity-70"
                }
                disabled={pending}
                type="submit"
              >
                <span className="inline-flex items-center gap-2">
                  <PlusCircle className="size-4" />
                  {pending ? "Adding" : `Add ${getRoomShareKindLabel(kind)}`}
                </span>
              </button>
            </div>
          </div>
        ) : null}

        {error ? <p className="text-[12px] text-[#d78b8b]">{error}</p> : null}
      </form>

      <ArtistCorrectionModal
        canonicalArtist={artistCorrection?.canonicalArtist ?? ""}
        onConfirm={() => {
          void handleArtistCorrectionConfirm();
        }}
        onReject={() => {
          setArtistCorrection(null);
        }}
        open={Boolean(artistCorrection?.open)}
        originalArtist={artistCorrection?.originalArtist ?? ""}
        pending={pending}
      />
      <SongCorrectionModal
        canonicalArtist={songCorrection?.canonicalArtist ?? ""}
        canonicalTitle={songCorrection?.canonicalTitle ?? ""}
        onConfirm={() => {
          void handleSongCorrectionConfirm();
        }}
        onReject={() => {
          setSongCorrection(null);
        }}
        open={Boolean(songCorrection?.open)}
        originalArtist={songCorrection?.originalArtist ?? ""}
        originalTitle={songCorrection?.originalTitle ?? ""}
        pending={pending}
      />
    </>
  );
}
