"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { useAuth } from "@/components/providers/auth-provider";
import { buildOnboardingRedirectPath } from "@/lib/frequency/app-redirect";
import { isOnboardingComplete } from "@/lib/frequency/onboarding";
import {
  addFriendRelationship,
  findUserProfileByFriendCode,
} from "@/lib/firebase/firestore";
import { getAvatarTone, getInitials } from "@/lib/utils";
import { GlassCard } from "./glass-card";
import { InviteAcceptanceDialog } from "./invite-acceptance-dialog";

export function FriendInviteScreen({ friendCode }: { friendCode: string }) {
  const router = useRouter();
  const { loading, profile, user } = useAuth();
  const profileOnboardingComplete = isOnboardingComplete(profile);
  const [targetProfile, setTargetProfile] = useState<Awaited<ReturnType<typeof findUserProfileByFriendCode>> | undefined>(undefined);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setLoadingProfile(true);
      setError(null);

      try {
        const nextProfile = await findUserProfileByFriendCode(friendCode);

        if (!cancelled) {
          setTargetProfile(nextProfile);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : "That friend invite could not be checked.",
          );
          setTargetProfile(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingProfile(false);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [friendCode]);

  const isSelfInvite = Boolean(user && targetProfile?.uid === user.uid);
  const isAlreadyFriend = Boolean(
    user &&
      targetProfile &&
      !isSelfInvite &&
      (profile?.friendIds ?? []).includes(targetProfile.uid),
  );
  const invitePending = Boolean(user && loading);
  const comparePath = profileOnboardingComplete ? "/compare" : buildOnboardingRedirectPath("/compare");
  const modalOpen = Boolean(user && targetProfile && !dismissed && !invitePending);

  const modalTitle = isSelfInvite
    ? "This is your invite"
    : isAlreadyFriend
      ? "You’re already friends"
      : "Add friend?";
  const modalDescription = isSelfInvite
    ? "Share this link with someone else and they’ll land in the same quick add flow."
    : isAlreadyFriend
      ? `${targetProfile?.displayName ?? "This person"} is already in your Friends tab.`
      : `Add ${targetProfile?.displayName ?? "this person"} to your Frequency circle.`;
  const confirmLabel = isSelfInvite || isAlreadyFriend ? "Open Friends" : "Add friend";
  const targetDisplayName = targetProfile?.displayName ?? "Frequency listener";
  const avatarTone = getAvatarTone(targetProfile?.uid ?? targetDisplayName);
  const initials = getInitials(targetDisplayName);

  async function handleConfirm() {
    if (!targetProfile || invitePending) {
      return;
    }

    if (isSelfInvite || isAlreadyFriend) {
      router.push(comparePath);
      return;
    }

    if (!user) {
      return;
    }

    setPending(true);
    setError(null);

    try {
      await addFriendRelationship({
        currentUserId: user.uid,
        friendUserId: targetProfile.uid,
      });
      router.push(comparePath);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "That friend could not be added right now.",
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
                Friend invite
              </p>
              <h1 className="text-[30px] font-semibold tracking-[-0.05em] text-[var(--text)]">
                {loadingProfile ? "Checking profile…" : targetProfile ? targetDisplayName : "Friend invite"}
              </h1>
              <p className="text-[15px] leading-6 text-[var(--text-soft)]">
                {loadingProfile
                  ? "We’re loading the person behind this invite."
                  : targetProfile
                    ? "One tap and they’ll land in your Friends tab."
                    : "This invite link doesn’t point to a profile we can find."}
              </p>
            </div>

            {targetProfile ? (
              <div className="surface-inline-soft flex items-center gap-3 rounded-[22px] px-4 py-4">
                <div
                  className="grid size-12 shrink-0 place-items-center rounded-full text-sm font-semibold text-white"
                  style={{ backgroundColor: avatarTone }}
                >
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold tracking-[-0.03em] text-[var(--text)]">
                    {targetDisplayName}
                  </p>
                  <p className="truncate text-[13px] leading-6 text-[var(--text-soft)]">
                    {targetProfile.email ?? "Frequency listener"}
                  </p>
                </div>
              </div>
            ) : null}

            {!user && targetProfile ? (
              <div className="space-y-3">
                <p className="text-[14px] leading-6 text-[var(--text-soft)]">
                  Sign in and Frequency will bring the add-friend prompt right back here.
                </p>
                <GoogleSignInButton />
              </div>
            ) : null}

            {invitePending ? (
              <p className="text-[14px] leading-6 text-[var(--text-soft)]">
                Preparing your account so we can finish this friend invite.
              </p>
            ) : null}

            {!loadingProfile && !targetProfile ? (
              <div className="space-y-4">
                <p className="text-[14px] leading-6 text-[var(--text-soft)]">
                  The link may be expired or mistyped.
                </p>
                <Link
                  className="button-secondary inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium"
                  href={user ? "/compare" : "/"}
                >
                  {user ? "Back to Friends" : "Back to Frequency"}
                </Link>
              </div>
            ) : null}

            {user && targetProfile && dismissed ? (
              <button
                className="button-secondary inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium"
                onClick={() => setDismissed(false)}
                type="button"
              >
                {isSelfInvite || isAlreadyFriend ? "Open invite prompt" : "Add this friend"}
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
          detailLabel="Invite from"
          detailValue={targetDisplayName}
          eyebrow="Friend invite"
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
