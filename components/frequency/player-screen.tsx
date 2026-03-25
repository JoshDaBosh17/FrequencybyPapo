import { EmptyStateCard } from "./empty-state-card";
import { GlassCard } from "./glass-card";

export function PlayerScreen() {
  return (
    <div className="space-y-5">
      <GlassCard strong className="overflow-hidden rounded-[28px] p-5 sm:p-6">
        <div className="space-y-4">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
            Player
          </p>
          <p className="text-[30px] font-semibold tracking-[-0.05em] text-[var(--text)]">
            Nothing playing yet
          </p>
          <p className="max-w-2xl text-[15px] leading-7 text-[var(--text-soft)]">
            The playback surface is wired into navigation, but the YouTube player remains an intentional placeholder until real room song data is ready.
          </p>
        </div>
      </GlassCard>

      <GlassCard className="min-h-[320px] rounded-[30px] border border-dashed border-[var(--line-strong)] p-6">
        <div className="flex h-full min-h-[260px] items-center justify-center rounded-[24px] bg-[linear-gradient(135deg,rgba(255,255,255,0.78),rgba(249,243,236,0.68))]">
          <p className="text-[16px] font-medium text-[var(--text-soft)]">
            YouTube player placeholder
          </p>
        </div>
      </GlassCard>

      <EmptyStateCard
        body="Pick up room activity from Home or Rooms once tracks start landing here."
        primaryAction="Back to Home"
        primaryHref="/home"
        secondaryAction="Open Rooms"
        secondaryHref="/rooms"
        title="Playback stays light for now"
        visual="music"
      />
    </div>
  );
}
