"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/components/providers/auth-provider";
import { GlassCard } from "@/components/frequency/glass-card";
import { ensureDemoRoomForUser } from "@/lib/firebase/firestore";
import {
  buildOnboardingRedirectPath,
  getSafeAppRedirectPath,
} from "@/lib/frequency/app-redirect";
import {
  getFrequencyDemoRoomPath,
  IS_FREQUENCY_DEMO_MODE,
} from "@/lib/frequency/demo-mode";
import { isOnboardingComplete } from "@/lib/frequency/onboarding";

type AuthGateProps = {
  children: React.ReactNode;
  mode: "public" | "protected" | "onboarding";
  onboardingCompleteRedirect?: string | null;
};

function GateLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <GlassCard strong className="w-full max-w-md p-6 sm:p-7">
        <div className="space-y-3">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
            Frequency
          </p>
          <p className="text-[20px] font-semibold tracking-[-0.03em] text-[var(--text)]">
            Opening your space
          </p>
          <p className="text-[15px] leading-6 text-[var(--text-soft)]">
            {IS_FREQUENCY_DEMO_MODE
              ? "Getting FP Capstone ready so you can jump straight into the shared room."
              : "Bringing your rooms, profile, and onboarding state into focus."}
          </p>
        </div>
      </GlassCard>
    </div>
  );
}

export function AuthGate({
  children,
  mode,
  onboardingCompleteRedirect,
}: AuthGateProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const profileOnboardingComplete = isOnboardingComplete(profile);
  const demoUserIdRef = useRef<string | null>(null);
  const [demoRoomState, setDemoRoomState] = useState<{
    path: string;
    uid: string;
  } | null>(null);

  useEffect(() => {
    if (!IS_FREQUENCY_DEMO_MODE) {
      return;
    }

    if (loading) {
      return;
    }

    if (!user) {
      demoUserIdRef.current = null;
      return;
    }

    if (demoUserIdRef.current === user.uid) {
      return;
    }

    let cancelled = false;

    demoUserIdRef.current = user.uid;

    void ensureDemoRoomForUser(user.uid)
      .then((room) => {
        if (cancelled) {
          return;
        }

        setDemoRoomState({
          path: getFrequencyDemoRoomPath(room.id),
          uid: user.uid,
        });
      })
      .catch((error) => {
        console.error("[frequency][demo-mode]", {
          error:
            error instanceof Error
              ? error.message
              : "Demo room could not be prepared.",
          event: "demo_room_prepare_failed",
          uid: user.uid,
        });

        if (cancelled) {
          return;
        }

        setDemoRoomState({
          path: "/rooms",
          uid: user.uid,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [loading, user]);

  const demoRoomPath =
    demoRoomState && demoRoomState.uid === user?.uid ? demoRoomState.path : null;
  const demoRoomPending =
    IS_FREQUENCY_DEMO_MODE &&
    Boolean(user) &&
    demoRoomState?.uid !== user?.uid;

  const demoRedirectPending =
    IS_FREQUENCY_DEMO_MODE &&
    Boolean(user) &&
    (demoRoomPending || !demoRoomPath || pathname !== demoRoomPath);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (IS_FREQUENCY_DEMO_MODE) {
      if (mode === "protected" && !user) {
        router.replace("/");
        return;
      }

      if (!user || !demoRoomPath || demoRoomPending) {
        return;
      }

      if (pathname !== demoRoomPath) {
        router.replace(demoRoomPath);
      }
      return;
    }

    if (mode === "public" && user) {
      router.replace(profileOnboardingComplete ? "/home" : "/onboarding");
      return;
    }

    if (mode === "protected") {
      if (!user) {
        router.replace("/");
        return;
      }

      if (!profileOnboardingComplete) {
        router.replace(buildOnboardingRedirectPath(pathname));
      }
    }

    if (mode === "onboarding") {
      if (profileOnboardingComplete) {
        router.replace(getSafeAppRedirectPath(onboardingCompleteRedirect));
      }
    }
  }, [
    demoRoomPath,
    demoRoomPending,
    loading,
    mode,
    onboardingCompleteRedirect,
    pathname,
    profileOnboardingComplete,
    router,
    user,
  ]);

  if (mode === "protected" && (loading || demoRedirectPending)) {
    return <GateLoading />;
  }

  if (mode === "onboarding" && ((loading && user) || demoRedirectPending)) {
    return <GateLoading />;
  }

  if (mode === "public") {
    return user && (!loading || demoRedirectPending) ? <GateLoading /> : <>{children}</>;
  }

  if (!user) {
    return mode === "onboarding" ? <>{children}</> : <GateLoading />;
  }

  if (!IS_FREQUENCY_DEMO_MODE && mode === "protected" && !profileOnboardingComplete) {
    return <GateLoading />;
  }

  if (!IS_FREQUENCY_DEMO_MODE && mode === "onboarding" && profileOnboardingComplete) {
    return <GateLoading />;
  }

  return <>{children}</>;
}
