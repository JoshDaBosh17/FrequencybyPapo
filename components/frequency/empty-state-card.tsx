import Link from "next/link";
import { Music4, Radio, Sparkles } from "lucide-react";

import { GlassCard } from "./glass-card";

type EmptyStateCardProps = {
  title: string;
  body: string;
  primaryAction: string;
  secondaryAction?: string;
  eyebrow?: string;
  visual?: "music" | "rooms" | "insights";
  primaryHref?: string;
  secondaryHref?: string;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
};

export function EmptyStateCard({
  title,
  body,
  primaryAction,
  secondaryAction,
  eyebrow,
  visual = "music",
  primaryHref,
  secondaryHref,
  onPrimaryAction,
  onSecondaryAction,
}: EmptyStateCardProps) {
  const icon =
    visual === "rooms" ? (
      <Radio className="size-5" />
    ) : visual === "insights" ? (
      <Sparkles className="size-5" />
    ) : (
      <Music4 className="size-5" />
    );

  return (
    <GlassCard strong className="overflow-hidden p-5 sm:p-6">
      <div className="space-y-5">
        <div className="relative overflow-hidden rounded-[24px] border border-[var(--line)] bg-[linear-gradient(135deg,rgba(255,255,255,0.88),rgba(248,241,234,0.92))] p-5">
          <div className="absolute -right-5 -top-8 size-24 rounded-full bg-[rgba(233,135,143,0.14)]" />
          <div className="absolute bottom-0 right-8 size-16 rounded-full bg-[rgba(130,187,156,0.16)]" />
          <div className="relative flex items-center gap-4">
            <div className="grid size-12 place-items-center rounded-[18px] border border-[var(--line)] bg-white/80 text-[var(--text-soft)]">
              {icon}
            </div>
            <div className="space-y-1">
              <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">
                {eyebrow ?? "Ready when you are"}
              </p>
              <p className="text-[15px] leading-6 text-[var(--text-soft)]">
                A calm starting point that turns into signal as soon as music and people show up.
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-[20px] font-semibold tracking-[-0.03em] text-[var(--text)]">
            {title}
          </p>
          <p className="max-w-[40rem] text-[15px] leading-6 text-[var(--text-soft)]">{body}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {primaryHref ? (
            <Link
              className="inline-flex min-h-12 items-center rounded-full bg-[var(--text)] px-5 text-[15px] font-medium text-white"
              href={primaryHref}
            >
              {primaryAction}
            </Link>
          ) : (
            <button
              className="min-h-12 rounded-full bg-[var(--text)] px-5 text-[15px] font-medium text-white"
              onClick={onPrimaryAction}
              type="button"
            >
              {primaryAction}
            </button>
          )}
          {secondaryAction ? (
            secondaryHref ? (
              <Link
                className="inline-flex min-h-12 items-center rounded-full border border-[var(--line)] bg-white/80 px-5 text-[15px] font-medium text-[var(--text-soft)]"
                href={secondaryHref}
              >
                {secondaryAction}
              </Link>
            ) : (
              <button
                className="min-h-12 rounded-full border border-[var(--line)] bg-white/80 px-5 text-[15px] font-medium text-[var(--text-soft)]"
                onClick={onSecondaryAction}
                type="button"
              >
                {secondaryAction}
              </button>
            )
          ) : null}
        </div>
      </div>
    </GlassCard>
  );
}
