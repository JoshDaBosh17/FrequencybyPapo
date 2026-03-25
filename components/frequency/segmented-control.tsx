import { cn } from "@/lib/utils";

type Segment<T extends string> = {
  id: T;
  label: string;
};

type SegmentedControlProps<T extends string> = {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div className="glass-surface-strong inline-flex min-h-12 w-full gap-1 rounded-full p-1">
      {segments.map((segment) => {
        const active = segment.id === value;

        return (
          <button
            key={segment.id}
            className={cn(
              "min-h-10 flex-1 rounded-full px-4 text-sm font-medium transition",
              active
                ? "bg-white text-[var(--text)] shadow-sm"
                : "text-[var(--text-soft)] hover:bg-white/55",
            )}
            onClick={() => onChange(segment.id)}
            type="button"
          >
            {segment.label}
          </button>
        );
      })}
    </div>
  );
}
