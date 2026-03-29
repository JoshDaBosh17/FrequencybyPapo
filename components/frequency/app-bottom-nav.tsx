"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dna, Home, Radio, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";

const tabs = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/rooms", label: "Rooms", icon: Radio },
  { href: "/compare", label: "Compare", icon: Dna },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export function AppBottomNav() {
  const pathname = usePathname();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-4">
      <div className="pointer-events-auto mx-auto max-w-[620px] rounded-[28px] border border-[var(--line)] bg-[rgba(10,13,20,0.84)] p-2 shadow-[0_18px_48px_rgba(0,0,0,0.34)] backdrop-blur-xl">
        <div className="grid grid-cols-4 gap-1">
          {tabs.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            const Icon = tab.icon;

            return (
              <Link
                key={tab.href}
                className={cn(
                  "flex min-h-[62px] flex-col items-center justify-center gap-1 rounded-[22px] px-2 text-[11px] font-medium transition",
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
