"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

import { getFriendCodeCopyValue } from "@/lib/frequency/friend-code";
import { cn } from "@/lib/utils";

export function FriendCodeCard({
  friendCode,
  title,
  description,
  className,
}: {
  friendCode: string | null | undefined;
  title: string;
  description: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCopied(false);
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [copied]);

  async function handleCopy() {
    const copyValue = getFriendCodeCopyValue(friendCode);

    if (!copyValue) {
      return;
    }

    try {
      await navigator.clipboard.writeText(copyValue);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--text-faint)]">
            {title}
          </p>
          <p className="text-[14px] leading-6 text-[var(--text-soft)]">{description}</p>
        </div>
        <div className="surface-inline-soft flex items-center justify-between gap-3 rounded-[18px] px-4 py-3">
          <p className="min-w-0 truncate font-mono text-[15px] font-semibold tracking-[0.16em] text-[var(--text)]">
            {friendCode ?? "Generating code"}
          </p>
          <button
            className="button-secondary inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-3 text-xs font-medium disabled:opacity-60"
            disabled={!friendCode}
            onClick={() => void handleCopy()}
            type="button"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}
