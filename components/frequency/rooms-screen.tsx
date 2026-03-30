"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { observeJoinedRooms } from "@/lib/firebase/firestore";
import type { FrequencyRoom } from "@/lib/types";
import { CreateRoomDialog } from "./create-room-dialog";
import { CreateRoomGridTile, RoomGridTile } from "./room-grid-tile";

const ROOM_TILE_GRID_CLASS =
  "grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";

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

  return (
    <>
      <div className="space-y-6 sm:space-y-7">
        <div className="space-y-2 px-1">
          <h1 className="text-[clamp(2rem,5vw,3.25rem)] font-semibold leading-[0.96] tracking-[-0.05em] text-[var(--text)]">
            Rooms
          </h1>
          <p className="max-w-[34rem] text-[15px] leading-6 text-[var(--text-soft)]">
            Shared spaces for the songs, people, and moments you want to keep moving.
          </p>
        </div>

        <div className={ROOM_TILE_GRID_CLASS}>
          {rooms.map((room) => (
            <RoomGridTile key={room.id} room={room} showMemberCount />
          ))}
          <CreateRoomGridTile onClick={() => setCreateOpen(true)} />
        </div>
      </div>
      <CreateRoomDialog onOpenChange={setCreateOpen} open={createOpen} />
    </>
  );
}
