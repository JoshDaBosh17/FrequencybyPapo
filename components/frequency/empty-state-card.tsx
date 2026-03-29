import Link from "next/link";
import { Music4, Radio, Sparkles } from "lucide-react";

import { GlassCard } from "./glass-card";

type EmptyStateCardProps = {
  title: string;
  body: string;
  primaryAction: string;
  secondaryAction?: string;
  secondaryActionEmphasis?: "default" | "solid";
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
  secondaryActionEmphasis = "default",
  eyebrow,
  visual = "music",
  primaryHref,
  secondaryHref,
  onPrimaryAction,
  onSecondaryAction,
}: EmptyStateCardProps) {
  const secondaryActionClassName =
    secondaryActionEmphasis === "solid"
      ? "button-primary inline-flex min-h-12 items-center rounded-full px-5 text-[15px] font-medium"
      : "button-secondary inline-flex min-h-12 items-center rounded-full px-5 text-[15px] font-medium";

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
        <div className="surface-inline-card relative overflow-hidden rounded-[24px] p-5">
          <div className="absolute -right-5 -top-8 size-24 rounded-full bg-[rgba(233,135,143,0.14)]" />
          <div className="absolute bottom-0 right-8 size-16 rounded-full bg-[rgba(130,187,156,0.16)]" />
          <div className="relative flex items-center gap-4">
            <div className="surface-pill grid size-12 place-items-center rounded-[18px] text-[var(--text-soft)]">
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
              className="button-primary inline-flex min-h-12 items-center rounded-full px-5 text-[15px] font-medium"
              href={primaryHref}
            >
              {primaryAction}
            </Link>
          ) : (
            <button
              className="button-primary min-h-12 rounded-full px-5 text-[15px] font-medium"
              onClick={onPrimaryAction}
              type="button"
            >
              {primaryAction}
            </button>
          )}
          {secondaryAction ? (
            secondaryHref ? (
              <Link className={secondaryActionClassName} href={secondaryHref}>
                {secondaryAction}
              </Link>
            ) : (
              <button className={secondaryActionClassName} onClick={onSecondaryAction} type="button">
                {secondaryAction}
              </button>
            )
          ) : null}
        </div>
      </div>
    </GlassCard>
  );
}
