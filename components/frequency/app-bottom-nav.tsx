"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dna, Home, Radio, UserRound } from "lucide-react";

import { IS_FREQUENCY_DEMO_MODE } from "@/lib/frequency/demo-mode";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/rooms", label: "Rooms", icon: Radio },
  { href: "/compare", label: "Friends", icon: Dna },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export function AppBottomNav() {
  const pathname = usePathname();
  const visibleTabs = IS_FREQUENCY_DEMO_MODE
    ? tabs.filter((tab) => tab.href === "/rooms")
    : tabs;

  return (
    <div className="app-bottom-nav pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-4 transition duration-200">
      <div
        className={cn(
          "pointer-events-auto mx-auto rounded-[28px] border border-[var(--line)] bg-[rgba(10,13,20,0.84)] p-2 shadow-[0_18px_48px_rgba(0,0,0,0.34)] backdrop-blur-xl",
          visibleTabs.length === 1 ? "max-w-[220px]" : "max-w-[760px]",
        )}
      >
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, minmax(0, 1fr))` }}
        >
          {visibleTabs.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            const Icon = tab.icon;

            return (
              <Link
                key={tab.href}
                className={cn(
                  "flex min-h-[62px] flex-col items-center justify-center gap-1 rounded-[22px] px-2 text-center text-[10px] font-medium leading-tight transition sm:text-[11px]",
                  active
                    ? "bg-[var(--surface-inline-strong)] text-[var(--text)]"
                    : "text-[var(--text-soft)] hover:bg-[rgba(255,255,255,0.03)] hover:text-[var(--text)]",
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
