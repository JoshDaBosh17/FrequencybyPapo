"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { useAuth } from "@/components/providers/auth-provider";
import { buildOnboardingRedirectPath } from "@/lib/frequency/app-redirect";
import { isOnboardingComplete } from "@/lib/frequency/onboarding";
import {
  acceptRoomInvite,
  findRoomByRoomCode,
} from "@/lib/firebase/firestore";
import { formatCount } from "@/lib/utils";
import { GlassCard } from "./glass-card";
import { InviteAcceptanceDialog } from "./invite-acceptance-dialog";

export function RoomInviteScreen({ roomCode }: { roomCode: string }) {
  const router = useRouter();
  const { loading, profile, user } = useAuth();
  const profileOnboardingComplete = isOnboardingComplete(profile);
  const [room, setRoom] = useState<Awaited<ReturnType<typeof findRoomByRoomCode>> | undefined>(undefined);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadRoom() {
      setLoadingRoom(true);
      setError(null);

      try {
        const nextRoom = await findRoomByRoomCode(roomCode);

        if (!cancelled) {
          setRoom(nextRoom);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : "That invite could not be checked.",
          );
          setRoom(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingRoom(false);
        }
      }
    }

    void loadRoom();

    return () => {
      cancelled = true;
    };
  }, [roomCode]);

  const isAlreadyMember = useMemo(
    () => Boolean(user && room?.memberIds.includes(user.uid)),
    [room?.memberIds, user],
  );
  const invitePending = Boolean(user && loading);
  const roomPath = room ? `/rooms/${room.id}` : "/rooms";
  const destinationPath = profileOnboardingComplete
    ? roomPath
    : buildOnboardingRedirectPath(roomPath);
  const modalOpen = Boolean(user && room && !dismissed && !invitePending);
  const modalTitle = isAlreadyMember ? "You’re already in this room" : "Join room?";
  const modalDescription = isAlreadyMember
    ? `${room?.name ?? "This room"} is already part of your spaces.`
    : `Join ${room?.name ?? "this room"} and start dropping songs into the shared lane.`;
  const confirmLabel = isAlreadyMember ? "Open room" : "Join room";

  async function handleConfirm() {
    if (!room || invitePending) {
      return;
    }

    if (isAlreadyMember) {
      router.push(destinationPath);
      return;
    }

    if (!user) {
      return;
    }

    setPending(true);
    setError(null);

    try {
      await acceptRoomInvite({
        roomId: room.id,
        uid: user.uid,
      });
      router.push(destinationPath);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "That room could not be joined right now.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="page-atmosphere flex min-h-screen items-center px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-xl space-y-6">
        <GlassCard strong className="rounded-[30px] p-6 sm:p-7">
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
                Room invite
              </p>
              <h1 className="text-[30px] font-semibold tracking-[-0.05em] text-[var(--text)]">
                {loadingRoom ? "Checking room…" : room ? room.name : "Room invite"}
              </h1>
              <p className="text-[15px] leading-6 text-[var(--text-soft)]">
                {loadingRoom
                  ? "We’re loading the room details now."
                  : room
                    ? `${formatCount(room.memberIds.length, "member")} already moving in this space.`
                    : "This invite link doesn’t point to a room we can find."}
              </p>
            </div>

            {!user && room ? (
              <div className="space-y-3">
                <p className="text-[14px] leading-6 text-[var(--text-soft)]">
                  Sign in and Frequency will bring the join prompt right back here.
                </p>
                <GoogleSignInButton />
              </div>
            ) : null}

            {invitePending ? (
              <p className="text-[14px] leading-6 text-[var(--text-soft)]">
                Preparing your account so we can finish this room invite.
              </p>
            ) : null}

            {!loadingRoom && !room ? (
              <div className="space-y-4">
                <p className="text-[14px] leading-6 text-[var(--text-soft)]">
                  The link may be expired or mistyped.
                </p>
                <Link
                  className="button-secondary inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium"
                  href={user ? "/rooms" : "/"}
                >
                  {user ? "Back to rooms" : "Back to Frequency"}
                </Link>
              </div>
            ) : null}

            {user && room && dismissed ? (
              <button
                className="button-secondary inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium"
                onClick={() => setDismissed(false)}
                type="button"
              >
                {isAlreadyMember ? "Open join prompt" : "Join this room"}
              </button>
            ) : null}

            {error ? (
              <p className="text-[13px] leading-6 text-[#d7a0a0]">{error}</p>
            ) : null}
          </div>
        </GlassCard>

        <InviteAcceptanceDialog
          cancelLabel="Not now"
          confirmLabel={confirmLabel}
          description={modalDescription}
          detailLabel="Members"
          detailValue={room ? formatCount(room.memberIds.length, "member") : null}
          eyebrow="Room invite"
          onClose={() => setDismissed(true)}
          onConfirm={() => void handleConfirm()}
          open={modalOpen}
          pending={pending || invitePending}
          title={modalTitle}
        />
      </div>
    </main>
  );
}
