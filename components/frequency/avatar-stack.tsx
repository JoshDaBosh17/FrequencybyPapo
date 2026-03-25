import { Person } from "@/lib/types";
import { cn } from "@/lib/utils";

type AvatarStackProps = {
  people: Person[];
  size?: "sm" | "md";
};

const sizeClasses = {
  sm: "size-8 text-[11px]",
  md: "size-10 text-[12px]",
};

export function AvatarStack({ people, size = "md" }: AvatarStackProps) {
  return (
    <div className="flex items-center">
      {people.map((person, index) => (
        <div
          key={person.id}
          className={cn(
            "grid shrink-0 place-items-center rounded-full border-2 border-[rgba(255,255,255,0.92)] font-semibold text-white shadow-sm",
            sizeClasses[size],
            index > 0 ? "-ml-3" : "",
          )}
          style={{ backgroundColor: person.color }}
          title={person.name}
        >
          {person.initials}
        </div>
      ))}
    </div>
  );
}
