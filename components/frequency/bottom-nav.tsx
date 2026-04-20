"use client";

import { Dna, Home, Radio, UserRound } from "lucide-react";

import { TabId } from "@/lib/types";
import { cn } from "@/lib/utils";

type BottomNavProps = {
  value: TabId;
  onChange: (value: TabId) => void;
};

const tabs: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
  { id: "home", label: "Home", icon: <Home className="size-4.5" /> },
  { id: "rooms", label: "Rooms", icon: <Radio className="size-4.5" /> },
  { id: "compare", label: "Friends", icon: <Dna className="size-4.5" /> },
  { id: "profile", label: "Profile", icon: <UserRound className="size-4.5" /> },
];

export function BottomNav({ value, onChange }: BottomNavProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-4">
      <div className="pointer-events-auto mx-auto max-w-[620px] rounded-[28px] border border-[var(--line)] bg-[rgba(10,13,20,0.84)] p-2 shadow-[0_18px_48px_rgba(0,0,0,0.34)] backdrop-blur-xl">
        <div className="grid grid-cols-4 gap-1">
          {tabs.map((tab) => {
            const active = tab.id === value;

            return (
              <button
                key={tab.id}
                className={cn(
                  "flex min-h-[62px] flex-col items-center justify-center gap-1 rounded-[22px] px-2 text-[11px] font-medium transition",
                  active
                    ? "bg-[var(--surface-inline-strong)] text-[var(--text)]"
                    : "text-[var(--text-soft)] hover:bg-[rgba(255,255,255,0.03)] hover:text-[var(--text)]",
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
