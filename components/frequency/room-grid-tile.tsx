"use client";

import Link from "next/link";
import { LogIn, LogOut, MoreHorizontal, Plus, Trash2, UserPlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
  "surface-inline-card relative flex aspect-square flex-col overflow-hidden rounded-[24px] px-3 py-[18px] text-center transition duration-200 hover:-translate-y-0.5 hover:bg-[rgba(29,35,47,0.9)]";

function RoomTileMenu({
  onDelete,
  onInvite,
  onLeave,
}: {
  onDelete?: () => void;
  onInvite?: () => void;
  onLeave?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointer(event: MouseEvent | TouchEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("touchstart", handlePointer);

    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("touchstart", handlePointer);
    };
  }, [open]);

  return (
    <div className="absolute right-2.5 top-2.5 z-[3]" ref={menuRef}>
      <button
        aria-label="Room actions"
        className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-full border border-white/8 bg-[rgba(9,11,17,0.8)] text-[var(--text-soft)] shadow-[0_10px_26px_rgba(0,0,0,0.2)] transition hover:text-[var(--text)]"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        type="button"
      >
        <MoreHorizontal className="size-4" />
      </button>

      {open ? (
        <div className="surface-inline-card absolute right-0 top-11 w-40 rounded-[18px] p-1.5 shadow-[0_18px_42px_rgba(0,0,0,0.36)]">
          {onInvite ? (
            <button
              className="flex min-h-11 w-full items-center gap-2 rounded-[14px] px-3 text-left text-[13px] font-medium text-[var(--text)] transition hover:bg-white/6"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setOpen(false);
                onInvite();
              }}
              type="button"
            >
              <UserPlus className="size-4 text-[var(--text-soft)]" />
              Invite to Group
            </button>
          ) : null}
          {onLeave ? (
            <button
              className="flex min-h-11 w-full items-center gap-2 rounded-[14px] px-3 text-left text-[13px] font-medium text-[var(--text)] transition hover:bg-white/6"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setOpen(false);
                onLeave();
              }}
              type="button"
            >
              <LogOut className="size-4 text-[var(--text-soft)]" />
              Leave Group
            </button>
          ) : null}
          {onDelete ? (
            <button
              className="flex min-h-11 w-full items-center gap-2 rounded-[14px] px-3 text-left text-[13px] font-medium text-[var(--text)] transition hover:bg-white/6"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setOpen(false);
                onDelete();
              }}
              type="button"
            >
              <Trash2 className="size-4 text-[var(--text-soft)]" />
              Delete Group
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function RoomGridTile({
  room,
  className,
  showMemberCount = false,
  onDelete,
  onInvite,
  onLeave,
}: {
  room: FrequencyRoom;
  className?: string;
  showMemberCount?: boolean;
  onDelete?: (room: FrequencyRoom) => void;
  onInvite?: (room: FrequencyRoom) => void;
  onLeave?: (room: FrequencyRoom) => void;
}) {
  const [start, end] = getRoomGradient(room.name);

  return (
    <div className={cn("group relative", className)}>
      {onInvite || onLeave || onDelete ? (
        <RoomTileMenu
          onDelete={onDelete ? () => onDelete(room) : undefined}
          onInvite={onInvite ? () => onInvite(room) : undefined}
          onLeave={onLeave ? () => onLeave(room) : undefined}
        />
      ) : null}

      <Link className="block" href={`/rooms/${room.id}`}>
        <div className={TILE_SURFACE_CLASS}>
          <div className="pointer-events-none absolute inset-x-4 top-0 h-16 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.06),transparent_72%)] blur-2xl" />
          <div className="relative z-[1] flex flex-1 flex-col items-center justify-center gap-4 pt-1.5">
            <span
              className="grid size-[58px] place-items-center rounded-full text-[21px] font-semibold leading-none tracking-[-0.03em] text-white shadow-[0_20px_34px_rgba(0,0,0,0.24)] sm:size-[64px] sm:text-[23px]"
              style={{
                background: `linear-gradient(180deg, ${start}, ${end})`,
              }}
            >
              <span className="translate-y-[0.5px]">{getRoomInitial(room.name)}</span>
            </span>

            <div className="w-full space-y-1">
              <p className="line-clamp-2 px-1 text-center text-[12px] font-medium leading-[1.2rem] text-[var(--text)] sm:text-[13px]">
                {room.name}
              </p>
              {showMemberCount ? (
                <p className="truncate text-center text-[10px] font-medium text-[var(--text-faint)]">
                  {formatCount(room.memberIds.length, "member")}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </Link>
    </div>
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
        <div className="relative z-[1] flex flex-1 flex-col items-center justify-center gap-4 pt-1.5">
          <span className="grid size-[58px] place-items-center rounded-full border border-white/12 bg-[rgba(255,255,255,0.04)] text-[var(--text-soft)] shadow-[0_16px_32px_rgba(0,0,0,0.18)] sm:size-[64px]">
            <Plus className="size-5" />
          </span>
          <div className="w-full space-y-1">
            <p className="px-1 text-center text-[12px] font-medium leading-[1.2rem] text-[var(--text)] sm:text-[13px]">
              Create Room
            </p>
            <p className="truncate text-center text-[10px] font-medium text-[var(--text-faint)]">
              Start a new shared space
            </p>
          </div>
        </div>
      </div>
    </button>
  );
}

export function JoinRoomGridTile({
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
        <div className="relative z-[1] flex flex-1 flex-col items-center justify-center gap-4 pt-1.5">
          <span className="grid size-[58px] place-items-center rounded-full border border-white/12 bg-[rgba(255,255,255,0.04)] text-[var(--text-soft)] shadow-[0_16px_32px_rgba(0,0,0,0.18)] sm:size-[64px]">
            <LogIn className="size-5" />
          </span>
          <div className="w-full space-y-1">
            <p className="px-1 text-center text-[12px] font-medium leading-[1.2rem] text-[var(--text)] sm:text-[13px]">
              Join Room
            </p>
            <p className="truncate text-center text-[10px] font-medium text-[var(--text-faint)]">
              Use a room code
            </p>
          </div>
        </div>
      </div>
    </button>
  );
}
