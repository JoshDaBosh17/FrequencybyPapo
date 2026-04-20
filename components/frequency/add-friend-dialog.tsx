"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { addFriendRelationship, findUserProfileByFriendCode } from "@/lib/firebase/firestore";
import { formatFriendCode } from "@/lib/frequency/friend-code";
import { buildAbsoluteInviteUrl, buildFriendInvitePath } from "@/lib/frequency/invite-links";
import { InviteShareActions } from "./invite-share-actions";
import { ModalBody, ModalFrame } from "./modal-frame";
import { useModalLock } from "./use-modal-lock";

export function AddFriendDialog({
  open,
  onClose,
  friendCode,
  displayName,
}: {
  open: boolean;
  onClose: () => void;
  friendCode: string | null | undefined;
  displayName?: string | null;
}) {
  const { profile, user } = useAuth();
  const [enteredFriendCode, setEnteredFriendCode] = useState("");
  const [pendingAdd, setPendingAdd] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: "error" | "success";
  } | null>(null);

  useModalLock({
    onClose,
    open,
  });

  useEffect(() => {
    if (open) {
      return;
    }

    setEnteredFriendCode("");
    setPendingAdd(false);
    setFeedback(null);
  }, [open]);

  if (!open) {
    return null;
  }

  const invitePath = buildFriendInvitePath(friendCode);
  const inviteLink = buildAbsoluteInviteUrl(invitePath);
  const formattedEnteredCode = formatFriendCode(enteredFriendCode);

  async function handleAddFriendByCode() {
    const currentUserId = user?.uid ?? profile?.uid ?? null;

    if (!currentUserId) {
      setFeedback({
        message: "Sign in again before adding a friend.",
        tone: "error",
      });
      return;
    }

    if (!enteredFriendCode.trim()) {
      setFeedback({
        message: "Enter a friend code first.",
        tone: "error",
      });
      return;
    }

    setPendingAdd(true);
    setFeedback(null);

    try {
      const targetProfile = await findUserProfileByFriendCode(enteredFriendCode);

      if (!targetProfile) {
        setFeedback({
          message: "We couldn’t find anyone with that friend code.",
          tone: "error",
        });
        return;
      }

      const result = await addFriendRelationship({
        currentUserId,
        friendUserId: targetProfile.uid,
      });

      if (result.status === "already_friends") {
        setFeedback({
          message: `${targetProfile.displayName ?? "This person"} is already in your Friends tab.`,
          tone: "success",
        });
        return;
      }

      onClose();
    } catch (error) {
      setFeedback({
        message:
          error instanceof Error ? error.message : "That friend could not be added right now.",
        tone: "error",
      });
    } finally {
      setPendingAdd(false);
    }
  }

  return (
    <ModalFrame className="max-w-lg" closeOnBackdrop onClose={onClose}>
      <ModalBody className="space-y-5 px-5 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
              Invite friend
            </p>
            <div className="space-y-1">
              <p className="text-[24px] font-semibold tracking-[-0.04em] text-[var(--text)]">
                Share your friend link
              </p>
              <p className="text-[15px] leading-6 text-[var(--text-soft)]">
                Send this out and Frequency will open a simple add-friend prompt as soon as they land.
              </p>
            </div>
          </div>

          <button
            aria-label="Close friend invite"
            className="button-secondary inline-flex min-h-10 min-w-10 items-center justify-center rounded-full px-3"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <InviteShareActions
          codeLabel="Friend code"
          codeValue={friendCode ?? null}
          linkValue={inviteLink}
          shareText={`${displayName ?? "Someone"} invited you to connect on Frequency.`}
          shareTitle="Frequency friend invite"
        />

        <div className="surface-inline-card space-y-4 rounded-[20px] px-4 py-4">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
              Add with a code
            </p>
            <p className="text-[14px] leading-6 text-[var(--text-soft)]">
              Paste someone else&apos;s friend code and we&apos;ll connect you here.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              autoCapitalize="characters"
              autoCorrect="off"
              className="field-surface min-h-12 flex-1 rounded-full px-4 text-[15px]"
              onChange={(event) => {
                setEnteredFriendCode(event.target.value.toUpperCase());
                setFeedback(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleAddFriendByCode();
                }
              }}
              placeholder="Enter a friend code"
              spellCheck={false}
              type="text"
              value={enteredFriendCode}
            />
            <button
              className="button-primary min-h-12 rounded-full px-5 text-[15px] font-medium disabled:opacity-70"
              disabled={pendingAdd || !enteredFriendCode.trim()}
              onClick={() => void handleAddFriendByCode()}
              type="button"
            >
              {pendingAdd ? "Adding" : "Add friend"}
            </button>
          </div>

          {formattedEnteredCode ? (
            <p className="text-[12px] leading-5 text-[var(--text-faint)]">
              Looking for {formattedEnteredCode}
            </p>
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
        </div>
      </ModalBody>
    </ModalFrame>
  );
}
