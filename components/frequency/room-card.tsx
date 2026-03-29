import { Room, Person } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AvatarStack } from "./avatar-stack";
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
      <div
        className={cn(
          "section-haze relative overflow-hidden rounded-[26px] transition duration-200 hover:bg-[linear-gradient(180deg,rgba(22,27,38,0.36),rgba(12,15,22,0.18))]",
          compact ? "min-h-16 p-3.5" : "min-h-[104px] p-4",
          selected ? "bg-[linear-gradient(180deg,rgba(27,33,45,0.48),rgba(15,19,27,0.24))]" : "",
        )}
      >
        <div className="absolute inset-x-6 top-0 h-14 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.06),transparent_72%)] blur-2xl" />
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
      </div>
    </button>
  );
}
