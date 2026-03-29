import { cn } from "@/lib/utils";

type StatPillProps = {
  children: React.ReactNode;
  className?: string;
};

export function StatPill({ children, className }: StatPillProps) {
  return (
    <span
      className={cn(
        "surface-pill inline-flex min-h-9 items-center rounded-full px-3 text-[12px] font-medium text-[var(--text-soft)]",
        className,
      )}
    >
      {children}
    </span>
  );
}
