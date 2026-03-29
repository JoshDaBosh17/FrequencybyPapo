import { ChevronDown, Hash, Music2, Sparkles, Users } from "lucide-react";

import { ChannelId } from "@/lib/types";
import { cn } from "@/lib/utils";

type ChannelSection = {
  id: ChannelId;
  label: string;
  children?: Array<{ id: ChannelId; label: string }>;
};

type ChannelListProps = {
  channels: ChannelSection[];
  value: ChannelId;
  onChange: (value: ChannelId) => void;
};

const iconMap: Partial<Record<ChannelId, React.ReactNode>> = {
  overview: <Sparkles className="size-4" />,
  house: <Music2 className="size-4" />,
  "afro-house": <Hash className="size-4" />,
  rap: <Hash className="size-4" />,
  chill: <Hash className="size-4" />,
  people: <Users className="size-4" />,
  songs: <Music2 className="size-4" />,
  insights: <Sparkles className="size-4" />,
};

export function ChannelList({ channels, value, onChange }: ChannelListProps) {
  return (
    <div className="glass-surface-strong rounded-[28px] p-4">
      <div className="space-y-4">
        {channels.map((section) => (
          <div key={section.id} className="space-y-2">
            <div className="flex items-center gap-2 px-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">
              <ChevronDown className="size-3.5" />
              {section.label}
            </div>
            <div className="space-y-1">
              {!section.children ? (
                <button
                  className={cn(
                    "flex min-h-11 w-full items-center gap-3 rounded-[18px] px-3 text-left text-[15px] font-medium transition",
                    value === section.id
                      ? "bg-[var(--surface-inline-strong)] text-[var(--text)]"
                      : "text-[var(--text-soft)] hover:bg-[var(--surface-inline)] hover:text-[var(--text)]",
                  )}
                  onClick={() => onChange(section.id)}
                  type="button"
                >
                  {iconMap[section.id]}
                  {section.label}
                </button>
              ) : (
                section.children.map((child) => (
                  <button
                    key={child.id}
                    className={cn(
                      "flex min-h-11 w-full items-center gap-3 rounded-[18px] px-3 text-left text-[15px] font-medium transition",
                      value === child.id
                        ? "bg-[var(--surface-inline-strong)] text-[var(--text)]"
                        : "text-[var(--text-soft)] hover:bg-[var(--surface-inline)] hover:text-[var(--text)]",
                    )}
                    onClick={() => onChange(child.id)}
                    type="button"
                  >
                    {iconMap[child.id]}
                    {child.label}
                  </button>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
