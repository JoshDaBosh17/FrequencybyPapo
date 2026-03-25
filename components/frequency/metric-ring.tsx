import { Metric } from "@/lib/types";
import { cn } from "@/lib/utils";

type MetricRingProps = {
  metric: Metric;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
};

const ringSizes = {
  sm: { wrapper: "size-16", hole: "size-11", value: "text-sm" },
  md: { wrapper: "size-20", hole: "size-14", value: "text-base" },
  lg: { wrapper: "size-24", hole: "size-[4.25rem]", value: "text-lg" },
};

export function MetricRing({
  metric,
  size = "md",
  showValue = false,
}: MetricRingProps) {
  const progress = Math.max(0, Math.min(metric.value, 100));
  const current = ringSizes[size];

  return (
    <div className="flex items-center gap-3">
      <div
        className={cn("relative rounded-full", current.wrapper)}
        style={{
          background: `conic-gradient(${metric.color} ${progress}%, var(--ring-track) ${progress}% 100%)`,
        }}
      >
        <div
          className={cn(
            "absolute inset-1 m-auto rounded-full bg-[rgba(248,245,241,0.96)]",
            current.hole,
          )}
        />
        <div className="absolute inset-0 grid place-items-center">
          {showValue ? (
            <span className={cn("font-semibold tracking-[-0.03em]", current.value)}>
              {metric.value}
            </span>
          ) : (
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: metric.color }}
            />
          )}
        </div>
      </div>
      <div className="space-y-0.5">
        <p className="text-[15px] font-semibold text-[var(--text)]">{metric.label}</p>
        {metric.detail ? (
          <p className="text-[13px] font-medium text-[var(--text-soft)]">{metric.detail}</p>
        ) : null}
      </div>
    </div>
  );
}
