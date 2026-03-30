"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Globe2, Lock, Music4, X } from "lucide-react";

import { getChannelVibe } from "@/lib/frequency/room-identity";
import type { FrequencyRoom, RoomShareItem } from "@/lib/types";
import { GlassCard } from "./glass-card";
import { RoomShareComposer } from "./room-share-composer";

type HomeAddMusicModalProps = {
  open: boolean;
  onClose: () => void;
  onOpenCreateRoom: () => void;
  onSubmit: (params: {
    roomId: string;
    channel: string;
    draft: {
      kind: RoomShareItem["kind"];
      title: string;
      subtitle?: string | null;
      url?: string | null;
      note?: string | null;
    };
  }) => Promise<void>;
  rooms: FrequencyRoom[];
};

export function HomeAddMusicModal({
  open,
  onClose,
  onOpenCreateRoom,
  onSubmit,
  rooms,
}: HomeAddMusicModalProps) {
  const readyRooms = useMemo(
    () => rooms.filter((room) => room.genreChannels.length > 0),
    [rooms],
  );
  const [selectedRoomId, setSelectedRoomId] = useState<string>(
    () => readyRooms[0]?.id ?? "",
  );
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const resolvedRoomId =
    readyRooms.find((room) => room.id === selectedRoomId)?.id ?? readyRooms[0]?.id ?? "";
  const selectedRoom =
    readyRooms.find((room) => room.id === resolvedRoomId) ?? null;
  const availableChannels = selectedRoom?.genreChannels ?? [];
  const resolvedChannel =
    availableChannels.find((channel) => channel === selectedChannel) ??
    availableChannels[0] ??
    "";
  const channelVibe =
    selectedRoom && resolvedChannel ? getChannelVibe(selectedRoom, resolvedChannel) : null;

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  const hasReadyRoom = Boolean(selectedRoom && resolvedChannel);

  return (
    <div
      className="modal-scrim fixed inset-0 z-50 flex items-center justify-center px-4 py-6 backdrop-blur-md"
      onClick={onClose}
    >
      <GlassCard
        strong
        className="w-full max-w-3xl rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(11,13,20,0.98),rgba(6,8,13,0.98))] p-5 shadow-[0_36px_90px_rgba(0,0,0,0.48)] sm:p-6"
      >
        <div
          className="space-y-5"
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">
                  Add music
                </p>
                <h2 className="text-[24px] font-semibold tracking-[-0.05em] text-[var(--text)] sm:text-[28px]">
                  Drop into a room
                </h2>
              </div>

              {hasReadyRoom && selectedRoom ? (
                <div className="flex flex-wrap gap-2">
                  <span className="surface-pill inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-[11px] font-medium text-[var(--text-soft)]">
                    <Music4 className="size-3.5" />
                    #{resolvedChannel}
                  </span>
                  <span className="surface-pill inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-[11px] font-medium text-[var(--text-soft)]">
                    {selectedRoom.visibility === "public" ? (
                      <Globe2 className="size-3.5" />
                    ) : (
                      <Lock className="size-3.5" />
                    )}
                    {selectedRoom.visibility === "public" ? "Shareable room" : "Private room"}
                  </span>
                  {channelVibe ? (
                    <span className="surface-pill inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-[11px] font-medium text-[var(--text-soft)]">
                      <ArrowUpRight className="size-3.5" />
                      {channelVibe}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>

            <button
              aria-label="Close add music"
              className="button-secondary inline-flex min-h-10 min-w-10 items-center justify-center rounded-full px-3"
              onClick={onClose}
              type="button"
            >
              <X className="size-4" />
            </button>
          </div>

          {!rooms.length ? (
            <div className="space-y-4">
              <p className="max-w-[32rem] text-[14px] leading-6 text-[var(--text-soft)]">
                Create a room first so songs, artists, and links have somewhere to land.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  className="button-primary min-h-11 rounded-full px-4 text-sm font-medium"
                  onClick={() => {
                    onClose();
                    onOpenCreateRoom();
                  }}
                  type="button"
                >
                  Create room
                </button>
              </div>
            </div>
          ) : !readyRooms.length ? (
            <div className="space-y-4">
              <p className="max-w-[32rem] text-[14px] leading-6 text-[var(--text-soft)]">
                Add a channel to one of your rooms first so this drop has a lane to live in.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  className="button-secondary inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium"
                  href="/rooms"
                  onClick={onClose}
                >
                  Open rooms
                </Link>
              </div>
            </div>
          ) : selectedRoom ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-faint)]">
                    Room
                  </span>
                  <select
                    className="field-surface min-h-12 w-full rounded-[18px] px-4 text-[14px]"
                    onChange={(event) => {
                      setSelectedRoomId(event.target.value);
                      setSelectedChannel("");
                      setSubmitError(null);
                    }}
                    value={resolvedRoomId}
                  >
                    {readyRooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-faint)]">
                    Channel
                  </span>
                  <select
                    className="field-surface min-h-12 w-full rounded-[18px] px-4 text-[14px]"
                    onChange={(event) => {
                      setSelectedChannel(event.target.value);
                      setSubmitError(null);
                    }}
                    value={resolvedChannel}
                  >
                    {availableChannels.map((channel) => (
                      <option key={channel} value={channel}>
                        #{channel}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <RoomShareComposer
                channel={resolvedChannel}
                channelVibe={channelVibe}
                onSubmit={async (draft) => {
                  if (!selectedRoom || !resolvedChannel) {
                    setSubmitError("Choose a room and channel first.");
                    return;
                  }

                  setSubmitError(null);
                  await onSubmit({
                    channel: resolvedChannel,
                    draft,
                    roomId: selectedRoom.id,
                  });
                  onClose();
                }}
                showHeader={false}
                visibility={selectedRoom.visibility}
              />
              {submitError ? <p className="text-[12px] text-[#d78b8b]">{submitError}</p> : null}
            </>
          ) : null}
        </div>
      </GlassCard>
    </div>
  );
}
