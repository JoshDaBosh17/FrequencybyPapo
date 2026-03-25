import { cn } from "@/lib/utils";

type GlassCardProps = {
  children: React.ReactNode;
  className?: string;
  strong?: boolean;
};

export function GlassCard({ children, className, strong }: GlassCardProps) {
  return (
    <div
      className={cn(
        strong ? "glass-surface-strong" : "glass-surface",
        "rounded-[24px]",
        className,
      )}
    >
      {children}
    </div>
  );
}
