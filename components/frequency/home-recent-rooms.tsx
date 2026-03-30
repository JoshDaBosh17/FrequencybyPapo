"use client";

import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";

import type { FrequencyRoom } from "@/lib/types";
import { RoomGridTile } from "./room-grid-tile";

export function HomeRecentRooms({
  onCreateRoom,
  rooms,
}: {
  onCreateRoom: () => void;
  rooms: FrequencyRoom[];
}) {
  const recentRooms = rooms.slice(0, 3);

  return (
    <section className="section-haze rounded-[30px] border border-[rgba(255,255,255,0.06)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_14px_34px_rgba(0,0,0,0.12)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-[var(--text)]">
            Recent Rooms
          </h2>
          <p className="max-w-[26rem] text-[13px] leading-5 text-[var(--text-soft)]">
            Quick access to the spaces where songs are landing right now.
          </p>
        </div>

        <Link
          className="button-secondary inline-flex min-h-10 shrink-0 items-center gap-2 self-start rounded-full px-3.5 text-xs font-medium"
          href="/rooms"
        >
          Open rooms
          <ArrowUpRight className="size-3.5" />
        </Link>
      </div>

      {recentRooms.length ? (
        <div className="mt-5 grid grid-cols-3 gap-3">
          {recentRooms.map((room) => (
            <RoomGridTile key={room.id} room={room} />
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-[24px] border border-[var(--line)] bg-[rgba(13,16,24,0.6)] px-4 py-[18px]">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[14px] leading-6 text-[var(--text-soft)]">
              No rooms yet. Start one and give your next songs a place to live.
            </p>
            <button
              className="button-secondary inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-3.5 text-xs font-medium"
              onClick={onCreateRoom}
              type="button"
            >
              <Plus className="size-3.5" />
              Create
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
