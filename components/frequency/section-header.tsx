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
        <button className="button-secondary min-h-11 rounded-full px-4 text-sm font-medium">
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
