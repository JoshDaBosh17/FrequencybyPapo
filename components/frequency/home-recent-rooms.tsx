"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { deleteRoom, leaveRoom } from "@/lib/firebase/firestore";
import { canLeaveRoom, canManageRoom } from "@/lib/frequency/room-roles";
import type { FrequencyRoom } from "@/lib/types";
import { DeleteRoomDialog } from "./delete-room-dialog";
import { LeaveRoomDialog } from "./leave-room-dialog";
import { RoomInviteDialog } from "./room-invite-dialog";
import { RoomGridTile } from "./room-grid-tile";

export function HomeRecentRooms({
  onCreateRoom,
  rooms,
}: {
  onCreateRoom: () => void;
  rooms: FrequencyRoom[];
}) {
  const { profile, user } = useAuth();
  const recentRooms = rooms.slice(0, 3);
  const [inviteRoom, setInviteRoom] = useState<FrequencyRoom | null>(null);
  const [deleteTargetRoom, setDeleteTargetRoom] = useState<FrequencyRoom | null>(null);
  const [leaveTargetRoom, setLeaveTargetRoom] = useState<FrequencyRoom | null>(null);
  const [pendingDeleteRoomId, setPendingDeleteRoomId] = useState<string | null>(null);
  const [pendingLeaveRoomId, setPendingLeaveRoomId] = useState<string | null>(null);
  const currentUserId = user?.uid ?? profile?.uid ?? null;

  async function handleConfirmLeaveRoom() {
    if (!leaveTargetRoom) {
      return;
    }

    if (!currentUserId) {
      return;
    }

    setPendingLeaveRoomId(leaveTargetRoom.id);

    try {
      await leaveRoom({
        roomId: leaveTargetRoom.id,
        uid: currentUserId,
      });
      setLeaveTargetRoom(null);
    } catch (error) {
      console.error("[frequency][room-tile]", {
        event: "leave_room_failed_from_home_recent_rooms",
        roomId: leaveTargetRoom.id,
        error: error instanceof Error ? error.message : "Leave room failed.",
      });
    } finally {
      setPendingLeaveRoomId((current) =>
        current === leaveTargetRoom.id ? null : current,
      );
    }
  }

  async function handleConfirmDeleteRoom() {
    if (!deleteTargetRoom || !currentUserId) {
      return;
    }

    setPendingDeleteRoomId(deleteTargetRoom.id);

    try {
      await deleteRoom({
        roomId: deleteTargetRoom.id,
        uid: currentUserId,
      });
      setDeleteTargetRoom(null);
    } catch (error) {
      console.error("[frequency][room-tile]", {
        event: "delete_room_failed_from_home_recent_rooms",
        roomId: deleteTargetRoom.id,
        error: error instanceof Error ? error.message : "Delete room failed.",
      });
    } finally {
      setPendingDeleteRoomId((current) =>
        current === deleteTargetRoom.id ? null : current,
      );
    }
  }

  return (
    <>
      <section className="space-y-5 px-1">
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
          <div className="grid grid-cols-3 gap-3">
            {recentRooms.map((room) => (
              <RoomGridTile
                key={room.id}
                onDelete={
                  currentUserId && canManageRoom(room, currentUserId)
                    ? setDeleteTargetRoom
                    : undefined
                }
                onInvite={setInviteRoom}
                onLeave={
                  currentUserId && canLeaveRoom(room, currentUserId)
                    ? setLeaveTargetRoom
                    : undefined
                }
                room={room}
              />
            ))}
          </div>
        ) : (
          <div className="surface-inline-soft rounded-[24px] px-4 py-[18px]">
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

      <RoomInviteDialog onClose={() => setInviteRoom(null)} open={Boolean(inviteRoom)} room={inviteRoom} />
      <DeleteRoomDialog
        onClose={() => {
          if (!pendingDeleteRoomId) {
            setDeleteTargetRoom(null);
          }
        }}
        onConfirm={() => void handleConfirmDeleteRoom()}
        pending={Boolean(deleteTargetRoom && pendingDeleteRoomId === deleteTargetRoom.id)}
        room={deleteTargetRoom}
      />
      <LeaveRoomDialog
        onClose={() => {
          if (!pendingLeaveRoomId) {
            setLeaveTargetRoom(null);
          }
        }}
        onConfirm={() => void handleConfirmLeaveRoom()}
        pending={Boolean(leaveTargetRoom && pendingLeaveRoomId === leaveTargetRoom.id)}
        room={leaveTargetRoom}
      />
    </>
  );
}
