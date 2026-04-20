"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { deleteRoom, leaveRoom, observeJoinedRooms } from "@/lib/firebase/firestore";
import { canLeaveRoom, canManageRoom } from "@/lib/frequency/room-roles";
import type { FrequencyRoom } from "@/lib/types";
import { CreateRoomDialog } from "./create-room-dialog";
import { DeleteRoomDialog } from "./delete-room-dialog";
import { JoinRoomDialog } from "./join-room-dialog";
import { LeaveRoomDialog } from "./leave-room-dialog";
import { RoomInviteDialog } from "./room-invite-dialog";
import { CreateRoomGridTile, JoinRoomGridTile, RoomGridTile } from "./room-grid-tile";

const ROOM_TILE_GRID_CLASS =
  "grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";

export function RoomsScreen() {
  const { profile, user } = useAuth();
  const [rooms, setRooms] = useState<FrequencyRoom[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [inviteRoom, setInviteRoom] = useState<FrequencyRoom | null>(null);
  const [deleteTargetRoom, setDeleteTargetRoom] = useState<FrequencyRoom | null>(null);
  const [leaveTargetRoom, setLeaveTargetRoom] = useState<FrequencyRoom | null>(null);
  const [pendingDeleteRoomId, setPendingDeleteRoomId] = useState<string | null>(null);
  const [pendingLeaveRoomId, setPendingLeaveRoomId] = useState<string | null>(null);
  const currentUserId = user?.uid ?? profile?.uid ?? null;

  useEffect(() => {
    if (!user) {
      return;
    }

    return observeJoinedRooms(user.uid, setRooms);
  }, [user]);

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
        event: "leave_room_failed_from_rooms_grid",
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
        event: "delete_room_failed_from_rooms_grid",
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
      <div className="page-atmosphere space-y-6 sm:space-y-7">
        <div className="space-y-2 px-1">
          <h1 className="text-[clamp(2rem,5vw,3.25rem)] font-semibold leading-[0.96] tracking-[-0.05em] text-[var(--text)]">
            Rooms
          </h1>
          <p className="max-w-[34rem] text-[15px] leading-6 text-[var(--text-soft)]">
            Shared spaces for the songs, people, and moments you want to keep moving.
          </p>
        </div>

        <div className={`relative ${ROOM_TILE_GRID_CLASS}`}>
          {rooms.map((room) => (
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
              showMemberCount
            />
          ))}
          <CreateRoomGridTile onClick={() => setCreateOpen(true)} />
          <JoinRoomGridTile onClick={() => setJoinOpen(true)} />
        </div>
      </div>
      <CreateRoomDialog onOpenChange={setCreateOpen} open={createOpen} />
      <JoinRoomDialog onClose={() => setJoinOpen(false)} open={joinOpen} />
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
