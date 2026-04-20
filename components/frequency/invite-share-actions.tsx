"use client";

import { Check, Copy, Link2, Share2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type InviteShareActionsProps = {
  codeLabel: string;
  codeValue: string | null;
  linkValue: string | null;
  shareTitle: string;
  shareText: string;
};

type CopyTarget = "code" | "link" | "share" | null;

export function InviteShareActions({
  codeLabel,
  codeValue,
  linkValue,
  shareTitle,
  shareText,
}: InviteShareActionsProps) {
  const [feedbackTarget, setFeedbackTarget] = useState<CopyTarget>(null);
  const canShare = useMemo(
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    [],
  );

  useEffect(() => {
    if (!feedbackTarget) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setFeedbackTarget(null);
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [feedbackTarget]);

  async function handleCopy(target: Exclude<CopyTarget, "share" | null>, value: string | null) {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setFeedbackTarget(target);
    } catch {
      setFeedbackTarget(null);
    }
  }

  async function handleShare() {
    if (!linkValue || !canShare) {
      return;
    }

    try {
      await navigator.share({
        text: shareText,
        title: shareTitle,
        url: linkValue,
      });
      setFeedbackTarget("share");
    } catch {
      setFeedbackTarget(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="surface-inline-soft flex items-center justify-between gap-3 rounded-[20px] px-4 py-3.5">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
            {codeLabel}
          </p>
          <p className="truncate font-mono text-[14px] font-semibold tracking-[0.16em] text-[var(--text)]">
            {codeValue ?? "Generating code"}
          </p>
        </div>
        <button
          className="button-secondary inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-3 text-xs font-medium disabled:opacity-60"
          disabled={!codeValue}
          onClick={() => void handleCopy("code", codeValue)}
          type="button"
        >
          {feedbackTarget === "code" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {feedbackTarget === "code" ? "Copied" : "Copy"}
        </button>
      </div>

      <div className="surface-inline-card space-y-3 rounded-[20px] px-4 py-3.5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[var(--text-soft)]">
            <Link2 className="size-4" />
          </span>
          <div className="min-w-0 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
              Invite link
            </p>
            <p className="break-all text-[13px] leading-5 text-[var(--text-soft)]">
              {linkValue ?? "Generating share link"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <button
            className="button-secondary inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-xs font-medium disabled:opacity-60"
            disabled={!linkValue}
            onClick={() => void handleCopy("link", linkValue)}
            type="button"
          >
            {feedbackTarget === "link" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {feedbackTarget === "link" ? "Copied" : "Copy link"}
          </button>
          {canShare ? (
            <button
              className="button-secondary inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-xs font-medium disabled:opacity-60"
              disabled={!linkValue}
              onClick={() => void handleShare()}
              type="button"
            >
              {feedbackTarget === "share" ? <Check className="size-3.5" /> : <Share2 className="size-3.5" />}
              {feedbackTarget === "share" ? "Shared" : "Share"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
