"use client";

import { Home, Radio, PlayCircle, UserRound } from "lucide-react";

import { TabId } from "@/lib/types";
import { cn } from "@/lib/utils";

type BottomNavProps = {
  value: TabId;
  onChange: (value: TabId) => void;
};

const tabs: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
  { id: "home", label: "Home", icon: <Home className="size-4.5" /> },
  { id: "rooms", label: "Rooms", icon: <Radio className="size-4.5" /> },
  { id: "player", label: "Player", icon: <PlayCircle className="size-4.5" /> },
  { id: "profile", label: "Profile", icon: <UserRound className="size-4.5" /> },
];

export function BottomNav({ value, onChange }: BottomNavProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-4">
      <div className="pointer-events-auto mx-auto max-w-[620px] rounded-[28px] border border-[var(--line)] bg-[rgba(255,255,255,0.82)] p-2 shadow-[0_14px_40px_rgba(87,71,54,0.12)] backdrop-blur-xl">
        <div className="grid grid-cols-4 gap-1">
          {tabs.map((tab) => {
            const active = tab.id === value;

            return (
              <button
                key={tab.id}
                className={cn(
                  "flex min-h-[62px] flex-col items-center justify-center gap-1 rounded-[22px] px-2 text-[11px] font-medium transition",
                  active ? "bg-white text-[var(--text)]" : "text-[var(--text-soft)]",
                )}
                onClick={() => onChange(tab.id)}
                type="button"
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
