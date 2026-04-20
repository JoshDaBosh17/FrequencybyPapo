import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

type GlassCardProps = {
  children: React.ReactNode;
  className?: string;
  strong?: boolean;
  style?: CSSProperties;
};

export function GlassCard({ children, className, strong, style }: GlassCardProps) {
  return (
    <div
      className={cn(
        strong ? "glass-surface-strong" : "glass-surface",
        "rounded-[24px]",
        className,
      )}
      style={style}
    >
      {children}
    </div>
  );
}
