"use client";

import { Music4, Plus } from "lucide-react";

import { withAlpha } from "@/lib/frequency/genre-colors";

function AddMusicHeroIcon({ accentColor }: { accentColor: string }) {
  return (
    <span className="relative inline-flex size-4 items-center justify-center">
      <Music4 className="size-4" style={{ color: accentColor }} />
      <Plus
        className="absolute -right-1.5 -top-1.5 size-3 rounded-full p-[1px]"
        style={{ background: withAlpha(accentColor, 0.2), color: "var(--text)" }}
      />
    </span>
  );
}

export function TimelineAddMusicButton({
  accentColor,
  className = "",
  disabled = false,
  onClick,
}: {
  accentColor: string;
  className?: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-label="Add music"
      className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border px-4 text-sm font-medium text-[var(--text)] transition hover:[filter:brightness(1.04)] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:[filter:none] ${className}`.trim()}
      disabled={disabled}
      onClick={onClick}
      title={disabled ? "Create a lane first" : "Add music"}
      type="button"
      style={{
        background: `linear-gradient(180deg, ${withAlpha(
          accentColor,
          0.18,
        )}, rgba(10,12,18,0.92) 78%)`,
        borderColor: withAlpha(accentColor, 0.34),
        boxShadow: `0 18px 36px ${withAlpha(accentColor, 0.18)}`,
      }}
    >
      <AddMusicHeroIcon accentColor={accentColor} />
      <span>Add Music</span>
    </button>
  );
}
