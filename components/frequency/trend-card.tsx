import { Trend } from "@/lib/types";
import { GlassCard } from "./glass-card";

type TrendCardProps = {
  trend: Trend;
  compact?: boolean;
};

export function TrendCard({ trend, compact }: TrendCardProps) {
  return (
    <GlassCard
      className={
        compact
          ? "min-w-[172px] overflow-hidden p-4"
          : "overflow-hidden p-4 sm:p-5"
      }
    >
      <div className="space-y-3">
        <div className="h-1.5 w-12 rounded-full bg-[linear-gradient(90deg,var(--genre-amber),var(--genre-sky))]" />
        <p className="text-[17px] font-semibold leading-5 tracking-[-0.03em] text-[var(--text)]">
          {trend.title}
        </p>
        <p className="text-[14px] leading-5 text-[var(--text-soft)]">{trend.detail}</p>
      </div>
    </GlassCard>
  );
}
