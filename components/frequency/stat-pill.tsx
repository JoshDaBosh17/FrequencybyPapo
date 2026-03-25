import { cn } from "@/lib/utils";

type StatPillProps = {
  children: React.ReactNode;
  className?: string;
};

export function StatPill({ children, className }: StatPillProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-9 items-center rounded-full border border-[var(--line)] bg-white/70 px-3 text-[12px] font-medium text-[var(--text-soft)]",
        className,
      )}
    >
      {children}
    </span>
  );
}
