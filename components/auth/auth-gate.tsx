"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/providers/auth-provider";
import { GlassCard } from "@/components/frequency/glass-card";

type AuthGateProps = {
  children: React.ReactNode;
  mode: "public" | "protected" | "onboarding";
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
            Bringing your rooms, profile, and onboarding state into focus.
          </p>
        </div>
      </GlassCard>
    </div>
  );
}

export function AuthGate({ children, mode }: AuthGateProps) {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (mode === "public" && user) {
      router.replace(profile?.onboardingComplete ? "/home" : "/onboarding");
      return;
    }

    if (mode === "protected") {
      if (!user) {
        router.replace("/");
        return;
      }

      if (!profile?.onboardingComplete) {
        router.replace("/onboarding");
      }
    }

    if (mode === "onboarding") {
      if (profile?.onboardingComplete) {
        router.replace("/home");
      }
    }
  }, [loading, mode, profile?.onboardingComplete, router, user]);

  if (mode === "protected" && loading) {
    return <GateLoading />;
  }

  if (mode === "onboarding" && loading && user) {
    return <GateLoading />;
  }

  if (mode === "public") {
    return user && !loading ? <GateLoading /> : <>{children}</>;
  }

  if (!user) {
    return mode === "onboarding" ? <>{children}</> : <GateLoading />;
  }

  if (mode === "protected" && !profile?.onboardingComplete) {
    return <GateLoading />;
  }

  if (mode === "onboarding" && profile?.onboardingComplete) {
    return <GateLoading />;
  }

  return <>{children}</>;
}
