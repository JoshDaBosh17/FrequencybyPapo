"use client";

import { LogOut } from "lucide-react";
import { usePathname } from "next/navigation";

import { useAuth } from "@/components/providers/auth-provider";
import { GlobalPlayerLayer } from "@/components/frequency/global-player-layer";
import { getAvatarTone, getInitials } from "@/lib/utils";
import { AppBottomNav } from "./app-bottom-nav";
import { GlassCard } from "./glass-card";

const titles: Record<string, string> = {
  "/home": "Home",
  "/rooms": "Rooms",
  "/compare": "Compare",
  "/profile": "Profile",
};

function getPageTitle(pathname: string) {
  if (pathname.startsWith("/rooms/")) {
    return "Room";
  }

  return titles[pathname] ?? "Frequency";
}

export function ProtectedAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { dataError, profile, signOut } = useAuth();
  const showTopCard = pathname === "/profile";

  const displayName = profile?.displayName ?? "Frequency listener";
  const initials = getInitials(displayName);
  const avatarTone = getAvatarTone(profile?.uid ?? displayName);

  return (
    <div className="pb-44">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-5 px-4 pt-4 sm:px-5 lg:px-8 lg:pt-6">
        {showTopCard ? (
          <GlassCard strong className="overflow-hidden rounded-[28px] p-4 sm:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
                  Frequency
                </p>
                <p className="text-[22px] font-semibold tracking-[-0.04em] text-[var(--text)]">
                  {getPageTitle(pathname)}
                </p>
                <p className="text-[14px] text-[var(--text-soft)]">
                  Rooms, shared taste, and a softer social music shell.
                </p>
              </div>
              <div className="flex items-center gap-3 self-start md:self-auto">
                <div
                  className="grid size-11 place-items-center rounded-full text-sm font-semibold text-white"
                  style={{ backgroundColor: avatarTone }}
                >
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-[var(--text)]">
                    {displayName}
                  </p>
                  <p className="truncate text-[13px] text-[var(--text-soft)]">
                    {profile?.email ?? "Signed in"}
                  </p>
                </div>
                <button
                  className="button-secondary inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium"
                  onClick={() => void signOut()}
                  type="button"
                >
                  <LogOut className="size-4" />
                  Sign out
                </button>
              </div>
            </div>
          </GlassCard>
        ) : null}
        {dataError ? (
          <GlassCard className="rounded-[24px] p-4">
            <p className="text-[14px] leading-6 text-[var(--text-soft)]">{dataError}</p>
          </GlassCard>
        ) : null}
        <GlobalPlayerLayer />
        {children}
      </div>
      <AppBottomNav />
    </div>
  );
}
