type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
};

export function SectionHeader({ title, actionLabel }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-[var(--text)]">
        {title}
      </h2>
      {actionLabel ? (
        <button className="min-h-11 rounded-full border border-[var(--line)] bg-white/70 px-4 text-sm font-medium text-[var(--text-soft)] transition hover:bg-white">
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
