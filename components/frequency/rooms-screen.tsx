"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { getRoomIdentityGenres } from "@/lib/frequency/room-identity";
import { observeJoinedRooms } from "@/lib/firebase/firestore";
import type { FrequencyRoom } from "@/lib/types";
import { formatCount } from "@/lib/utils";
import { EmptyStateCard } from "./empty-state-card";
import { CreateRoomDialog } from "./create-room-dialog";
import { RoomIdentityHelix } from "./room-identity-helix";

const ROOM_CARD_GRID_CLASS = "grid gap-3 md:grid-cols-2 xl:grid-cols-3";
const ROOM_CARD_SURFACE_CLASS = "section-haze relative overflow-hidden rounded-[26px] p-3.5 sm:p-4";
const ROOM_CARD_CONTENT_CLASS = "flex items-center gap-3.5";
const ROOM_CARD_HELIX_CLASS = "h-[92px] w-[88px] sm:h-[100px] sm:w-[96px]";
const ROOM_CARD_NAME_CLASS = "text-[19px] font-semibold tracking-[-0.04em] text-[var(--text)]";
const ROOM_CARD_DESCRIPTION_CLASS =
  "line-clamp-2 text-[13px] leading-5 text-[var(--text-soft)]";
const ROOM_CARD_META_CLASS = "text-[12px] font-medium text-[var(--text-faint)]";
const CREATE_TILE_ICON_CLASS =
  "surface-pill grid size-10 shrink-0 place-items-center rounded-[16px] text-[var(--text-soft)]";

export function RoomsScreen() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<FrequencyRoom[]>([]);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    return observeJoinedRooms(user.uid, setRooms);
  }, [user]);

  if (!rooms.length) {
    return (
      <>
        <div className="space-y-5 sm:space-y-6">
          <EmptyStateCard
            body="Create a room for friends, an event, or a shared vibe."
            eyebrow="Rooms"
            onPrimaryAction={() => setCreateOpen(true)}
            primaryAction="Create a room"
            secondaryAction="Join with invite code"
            title="No rooms yet"
            visual="rooms"
          />
          <div className="section-haze-strong rounded-[30px] px-5 py-5 sm:px-6">
            <div className="grid gap-5 md:grid-cols-3 md:gap-6">
              <div className="space-y-2 md:pr-4">
                <p className="text-[17px] font-semibold tracking-[-0.03em] text-[var(--text)]">
                  Start with a vibe
                </p>
                <p className="text-[14px] leading-6 text-[var(--text-soft)]">
                  Every room starts with its own music identity, then sharpens as drops show up.
                </p>
              </div>
              <div className="space-y-2 md:border-l md:border-[rgba(255,255,255,0.08)] md:px-5">
                <p className="text-[17px] font-semibold tracking-[-0.03em] text-[var(--text)]">
                  Keep it personal or open it up
                </p>
                <p className="text-[14px] leading-6 text-[var(--text-soft)]">
                  Personal and public visibility can shape how intimate or discoverable the room feels.
                </p>
              </div>
              <div className="space-y-2 md:border-l md:border-[rgba(255,255,255,0.08)] md:pl-5">
                <p className="text-[17px] font-semibold tracking-[-0.03em] text-[var(--text)]">
                  Build a song space
                </p>
                <p className="text-[14px] leading-6 text-[var(--text-soft)]">
                  Artists, links, and shared picks can stack into a room identity over time.
                </p>
              </div>
            </div>
          </div>
        </div>
        <CreateRoomDialog onOpenChange={setCreateOpen} open={createOpen} />
      </>
    );
  }

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
              Rooms hub
            </p>
            <h1 className="text-[30px] font-semibold tracking-[-0.05em] text-[var(--text)]">
              Your shared spaces
            </h1>
            <p className="text-[15px] leading-7 text-[var(--text-soft)]">
              Pick a room by its helix, its visibility, or the kind of shared song space you want to step into.
            </p>
          </div>
          <button
            className="button-primary min-h-12 rounded-full px-5 text-[15px] font-medium"
            onClick={() => setCreateOpen(true)}
            type="button"
          >
            Create room
          </button>
        </div>

        <div className="section-divider" />

        <div className={ROOM_CARD_GRID_CLASS}>
          {rooms.map((room) => {
            const identityGenres = getRoomIdentityGenres(room);

            return (
              <Link key={room.id} href={`/rooms/${room.id}`}>
                <div className={ROOM_CARD_SURFACE_CLASS}>
                  <div className="absolute inset-x-7 top-0 h-14 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.06),transparent_72%)] blur-2xl" />
                  <div className={`${ROOM_CARD_CONTENT_CLASS} relative`}>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p className={ROOM_CARD_NAME_CLASS}>
                        {room.name}
                      </p>
                      {room.description.trim() ? (
                        <p className={ROOM_CARD_DESCRIPTION_CLASS}>{room.description}</p>
                      ) : null}
                      <p className={ROOM_CARD_META_CLASS}>
                        {formatCount(room.memberIds.length, "member")}
                      </p>
                    </div>
                    <RoomIdentityHelix className={`shrink-0 ${ROOM_CARD_HELIX_CLASS}`} genres={identityGenres} />
                  </div>
                </div>
              </Link>
            );
          })}
          <button className="w-full text-left" onClick={() => setCreateOpen(true)} type="button">
            <div className={`${ROOM_CARD_SURFACE_CLASS} border border-dashed border-white/10`}>
              <div className={ROOM_CARD_CONTENT_CLASS}>
                <div className={CREATE_TILE_ICON_CLASS}>
                  <Plus className="size-4" />
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className={ROOM_CARD_NAME_CLASS}>Start another room</p>
                  <p className={ROOM_CARD_DESCRIPTION_CLASS}>
                    Leave space for a new helix and a new shared music lane.
                  </p>
                  <p className={ROOM_CARD_META_CLASS}>Create room</p>
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>
      <CreateRoomDialog onOpenChange={setCreateOpen} open={createOpen} />
    </>
  );
}
