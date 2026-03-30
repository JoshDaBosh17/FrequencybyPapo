"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

import type { FrequencyRoom } from "@/lib/types";
import { cn, formatCount } from "@/lib/utils";

const ROOM_GRADIENTS = [
  ["#d29d7b", "#7a4f58"],
  ["#8bb9d8", "#2d4566"],
  ["#d78ba6", "#5e3651"],
  ["#8bb89e", "#2d5948"],
  ["#d7c28b", "#6a5640"],
] as const;

function hashRoomName(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

function getRoomGradient(name: string) {
  return ROOM_GRADIENTS[hashRoomName(name) % ROOM_GRADIENTS.length] ?? ROOM_GRADIENTS[0];
}

function getRoomInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "R";
}

const TILE_SURFACE_CLASS =
  "surface-inline-card relative flex aspect-square flex-col items-center justify-between overflow-hidden rounded-[24px] px-3 py-[18px] text-center transition duration-200 hover:-translate-y-0.5 hover:bg-[rgba(29,35,47,0.9)]";

export function RoomGridTile({
  room,
  className,
  showMemberCount = false,
}: {
  room: FrequencyRoom;
  className?: string;
  showMemberCount?: boolean;
}) {
  const [start, end] = getRoomGradient(room.name);

  return (
    <Link
      className={cn("group block", className)}
      href={`/rooms/${room.id}`}
    >
      <div className={TILE_SURFACE_CLASS}>
        <div className="pointer-events-none absolute inset-x-4 top-0 h-16 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.06),transparent_72%)] blur-2xl" />
        <span
          className="relative z-[1] mt-1 grid size-12 place-items-center rounded-full text-[18px] font-semibold tracking-[-0.03em] text-white shadow-[0_16px_32px_rgba(0,0,0,0.22)] sm:size-14"
          style={{
            background: `linear-gradient(180deg, ${start}, ${end})`,
          }}
        >
          {getRoomInitial(room.name)}
        </span>
        <div className="relative z-[1] w-full space-y-1">
          <p className="line-clamp-2 px-1 text-[11px] font-medium leading-4 text-[var(--text)] sm:text-[12px]">
            {room.name}
          </p>
          {showMemberCount ? (
            <p className="truncate text-[10px] font-medium text-[var(--text-faint)]">
              {formatCount(room.memberIds.length, "member")}
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export function CreateRoomGridTile({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      className={cn("block w-full text-left", className)}
      onClick={onClick}
      type="button"
    >
      <div
        className={cn(
          TILE_SURFACE_CLASS,
          "border border-dashed border-white/10 bg-[rgba(12,15,23,0.54)] hover:bg-[rgba(18,22,32,0.82)]",
        )}
      >
        <div className="pointer-events-none absolute inset-x-4 top-0 h-16 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.05),transparent_72%)] blur-2xl" />
        <span className="relative z-[1] mt-1 grid size-12 place-items-center rounded-full border border-white/12 bg-[rgba(255,255,255,0.04)] text-[var(--text-soft)] shadow-[0_16px_32px_rgba(0,0,0,0.18)] sm:size-14">
          <Plus className="size-5" />
        </span>
        <div className="relative z-[1] w-full space-y-1">
          <p className="px-1 text-[11px] font-medium leading-4 text-[var(--text)] sm:text-[12px]">
            Create Room
          </p>
          <p className="truncate text-[10px] font-medium text-[var(--text-faint)]">
            Start a new shared space
          </p>
        </div>
      </div>
    </button>
  );
}
