"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PlayCircle, Radio, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";

const tabs = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/rooms", label: "Rooms", icon: Radio },
  { href: "/player", label: "Player", icon: PlayCircle },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export function AppBottomNav() {
  const pathname = usePathname();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-4">
      <div className="pointer-events-auto mx-auto max-w-[620px] rounded-[28px] border border-[var(--line)] bg-[rgba(255,255,255,0.82)] p-2 shadow-[0_14px_40px_rgba(87,71,54,0.12)] backdrop-blur-xl">
        <div className="grid grid-cols-4 gap-1">
          {tabs.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            const Icon = tab.icon;

            return (
              <Link
                key={tab.href}
                className={cn(
                  "flex min-h-[62px] flex-col items-center justify-center gap-1 rounded-[22px] px-2 text-[11px] font-medium transition",
                  active ? "bg-white text-[var(--text)]" : "text-[var(--text-soft)]",
                )}
                href={tab.href}
              >
                <Icon className="size-[18px]" />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
