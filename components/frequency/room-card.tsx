import { Room, Person } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AvatarStack } from "./avatar-stack";
import { GlassCard } from "./glass-card";
import { StatPill } from "./stat-pill";

type RoomCardProps = {
  room: Room;
  people: Person[];
  selected?: boolean;
  compact?: boolean;
  onClick?: () => void;
};

export function RoomCard({
  room,
  people,
  selected,
  compact,
  onClick,
}: RoomCardProps) {
  const roomPeople = people.filter((person) => room.memberIds.includes(person.id)).slice(0, 4);
  const socialLabel =
    roomPeople.length > 1
      ? `${roomPeople[0]?.name} + ${roomPeople.length - 1} others`
      : roomPeople[0]?.name ?? "Ready for people";

  return (
    <button className="w-full text-left" onClick={onClick} type="button">
      <GlassCard
        strong={selected}
        className={cn(
          compact ? "min-h-16 p-3.5" : "min-h-[104px] p-4",
          selected ? "border-[var(--line-strong)] bg-white/90" : "",
        )}
      >
        <div className="flex h-full items-start justify-between gap-4">
          <div className="flex min-w-0 gap-3">
            <div
              className="grid size-12 shrink-0 place-items-center rounded-[18px] text-sm font-semibold text-white"
              style={{ backgroundColor: room.accent }}
            >
              {room.icon}
            </div>
            <div className="min-w-0 space-y-1">
              <p className="truncate text-[17px] font-semibold tracking-[-0.03em] text-[var(--text)]">
                {room.name}
              </p>
              <p className="line-clamp-2 text-[14px] leading-5 text-[var(--text-soft)]">
                {room.descriptor}
              </p>
            </div>
          </div>
          {!compact ? (
            <div className="hidden shrink-0 sm:block">
              <StatPill>{room.liveLabel ?? room.memberCountLabel}</StatPill>
            </div>
          ) : null}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <AvatarStack people={roomPeople} size="sm" />
          <p className="text-right text-[13px] font-medium text-[var(--text-faint)]">
            {compact ? socialLabel : room.memberCountLabel}
          </p>
        </div>
      </GlassCard>
    </button>
  );
}
