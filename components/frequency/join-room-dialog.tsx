"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { acceptRoomInvite, findRoomByRoomCode } from "@/lib/firebase/firestore";
import { formatRoomCode } from "@/lib/frequency/room-code";
import type { FrequencyRoom } from "@/lib/types";
import { useMountedRef } from "@/lib/use-mounted-ref";
import { formatCount } from "@/lib/utils";
import { ModalBody, ModalFrame } from "./modal-frame";
import { useModalLock } from "./use-modal-lock";

export function JoinRoomDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { profile, user } = useAuth();
  const mountedRef = useMountedRef();
  const [enteredRoomCode, setEnteredRoomCode] = useState("");
  const [resolvedRoom, setResolvedRoom] = useState<FrequencyRoom | null>(null);
  const [pendingLookup, setPendingLookup] = useState(false);
  const [pendingJoin, setPendingJoin] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: "error" | "success";
  } | null>(null);

  const currentUserId = user?.uid ?? profile?.uid ?? null;
  const formattedEnteredCode = formatRoomCode(enteredRoomCode);
  const isAlreadyMember = Boolean(
    currentUserId && resolvedRoom?.memberIds.includes(currentUserId),
  );
  const pending = pendingLookup || pendingJoin;

  useModalLock({
    closeOnEscape: !pending,
    onClose,
    open,
  });

  useEffect(() => {
    if (open) {
      return;
    }

    setEnteredRoomCode("");
    setResolvedRoom(null);
    setPendingLookup(false);
    setPendingJoin(false);
    setFeedback(null);
  }, [open]);

  if (!open) {
    return null;
  }

  async function handleFindRoom() {
    if (!enteredRoomCode.trim()) {
      setFeedback({
        message: "Enter a room code first.",
        tone: "error",
      });
      return;
    }

    setPendingLookup(true);
    setResolvedRoom(null);
    setFeedback(null);

    try {
      const nextRoom = await findRoomByRoomCode(enteredRoomCode);

      if (!mountedRef.current) {
        return;
      }

      if (!nextRoom) {
        setFeedback({
          message: "We couldn’t find a room with that code.",
          tone: "error",
        });
        return;
      }

      setResolvedRoom(nextRoom);
    } catch (error) {
      if (mountedRef.current) {
        setFeedback({
          message:
            error instanceof Error
              ? error.message
              : "That room could not be checked right now.",
          tone: "error",
        });
      }
    } finally {
      if (mountedRef.current) {
        setPendingLookup(false);
      }
    }
  }

  async function handleJoinRoom() {
    if (!resolvedRoom) {
      return;
    }

    if (!currentUserId) {
      setFeedback({
        message: "Sign in again before joining a room.",
        tone: "error",
      });
      return;
    }

    setPendingJoin(true);
    setFeedback(null);

    try {
      const result = await acceptRoomInvite({
        roomId: resolvedRoom.id,
        uid: currentUserId,
      });

      onClose();
      router.push(`/rooms/${result.room.id}`);
    } catch (error) {
      if (mountedRef.current) {
        setFeedback({
          message:
            error instanceof Error
              ? error.message
              : "That room could not be joined right now.",
          tone: "error",
        });
      }
    } finally {
      if (mountedRef.current) {
        setPendingJoin(false);
      }
    }
  }

  return (
    <ModalFrame className="max-w-lg" closeOnBackdrop={!pending} onClose={onClose}>
      <ModalBody className="space-y-5 px-5 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
              Join room
            </p>
            <div className="space-y-1">
              <p className="text-[24px] font-semibold tracking-[-0.04em] text-[var(--text)]">
                Enter a room code
              </p>
              <p className="text-[15px] leading-6 text-[var(--text-soft)]">
                Paste a code from a friend and we&apos;ll bring that room into your spaces.
              </p>
            </div>
          </div>

          <button
            aria-label="Close join room"
            className="button-secondary inline-flex min-h-10 min-w-10 items-center justify-center rounded-full px-3 disabled:opacity-60"
            disabled={pending}
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="surface-inline-card space-y-4 rounded-[20px] px-4 py-4">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
              Room code
            </p>
            <p className="text-[14px] leading-6 text-[var(--text-soft)]">
              Codes can look like `RM-ABC-123`, but we&apos;ll also read them without dashes.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              autoCapitalize="characters"
              autoCorrect="off"
              className="field-surface min-h-12 flex-1 rounded-full px-4 text-[15px]"
              onChange={(event) => {
                setEnteredRoomCode(event.target.value.toUpperCase());
                setResolvedRoom(null);
                setFeedback(null);
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter") {
                  return;
                }

                event.preventDefault();

                if (resolvedRoom) {
                  void handleJoinRoom();
                  return;
                }

                void handleFindRoom();
              }}
              placeholder="Enter a room code"
              spellCheck={false}
              type="text"
              value={enteredRoomCode}
            />
            <button
              className="button-primary min-h-12 rounded-full px-5 text-[15px] font-medium disabled:opacity-70"
              disabled={pendingLookup || !enteredRoomCode.trim()}
              onClick={() => void handleFindRoom()}
              type="button"
            >
              {pendingLookup ? "Checking" : "Find room"}
            </button>
          </div>

          {formattedEnteredCode ? (
            <p className="text-[12px] leading-5 text-[var(--text-faint)]">
              Looking for {formattedEnteredCode}
            </p>
          ) : null}
        </div>

        {resolvedRoom ? (
          <div className="surface-inline-card space-y-4 rounded-[20px] px-4 py-4">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
                Room found
              </p>
              <p className="text-[18px] font-semibold tracking-[-0.03em] text-[var(--text)]">
                {resolvedRoom.name}
              </p>
              <p className="text-[14px] leading-6 text-[var(--text-soft)]">
                {resolvedRoom.description || "No description yet, but the room is ready for new songs."}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 text-[12px] font-medium text-[var(--text-faint)]">
              <span>{formatCount(resolvedRoom.memberIds.length, "member")}</span>
              {resolvedRoom.roomCode ? <span>{resolvedRoom.roomCode}</span> : null}
            </div>

            {isAlreadyMember ? (
              <p className="text-[13px] leading-6 text-[#9fd6b1]">
                You&apos;re already in this room. You can open it directly.
              </p>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                className="button-primary min-h-12 rounded-full px-5 text-[15px] font-medium disabled:opacity-70"
                disabled={pending}
                onClick={() => void handleJoinRoom()}
                type="button"
              >
                {pendingJoin ? (isAlreadyMember ? "Opening" : "Joining") : isAlreadyMember ? "Open room" : "Join room"}
              </button>
              <button
                className="button-secondary min-h-12 rounded-full px-5 text-[15px] font-medium disabled:opacity-70"
                disabled={pending}
                onClick={() => {
                  setEnteredRoomCode("");
                  setResolvedRoom(null);
                  setFeedback(null);
                }}
                type="button"
              >
                Try another code
              </button>
            </div>
          </div>
        ) : null}

        {feedback ? (
          <p
            className={`text-[13px] leading-6 ${
              feedback.tone === "error" ? "text-[#d7a0a0]" : "text-[#9fd6b1]"
            }`}
          >
            {feedback.message}
          </p>
        ) : null}
      </ModalBody>
    </ModalFrame>
  );
}
