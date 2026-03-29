import { GlassCard } from "@/components/frequency/glass-card";
import { GoogleSignInButton } from "./google-sign-in-button";

export function SignedOutScreen() {
  return (
    <main className="relative flex min-h-screen items-center overflow-hidden px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[8%] top-[8%] h-56 w-56 rounded-full bg-[rgba(233,135,143,0.16)] blur-3xl" />
        <div className="absolute right-[10%] top-[18%] h-64 w-64 rounded-full bg-[rgba(130,187,156,0.16)] blur-3xl" />
        <div className="absolute bottom-[10%] left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[rgba(174,160,217,0.12)] blur-3xl" />
      </div>

      <div className="relative mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <section className="space-y-6">
          <div className="surface-pill inline-flex items-center gap-3 rounded-full px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)] shadow-[var(--shadow-soft)]">
            <span className="grid size-8 place-items-center rounded-full bg-[linear-gradient(180deg,rgba(42,51,69,0.98),rgba(20,26,38,0.98))] text-[11px] text-[var(--action-text)] shadow-[0_10px_22px_rgba(0,0,0,0.26)]">
              F
            </span>
            Frequency
          </div>

          <div className="max-w-2xl space-y-4">
            <h1 className="text-balance text-[42px] font-semibold tracking-[-0.06em] text-[var(--text)] sm:text-[58px]">
              Music feels better when it&apos;s shared.
            </h1>
            <p className="max-w-xl text-[18px] leading-8 text-[var(--text-soft)]">
              Build rooms, invite people, and shape the vibe together.
            </p>
          </div>

          <div className="max-w-md space-y-3">
            <GoogleSignInButton />
            <p className="text-[14px] leading-6 text-[var(--text-faint)]">
              Start with your taste, then make it social.
            </p>
          </div>
        </section>

        <GlassCard strong className="relative overflow-hidden p-6 sm:p-7 lg:min-h-[560px]">
          <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-[rgba(233,135,143,0.18)] blur-3xl" />
          <div className="absolute bottom-0 left-6 h-40 w-40 rounded-full bg-[rgba(130,187,156,0.18)] blur-3xl" />
          <div className="relative flex h-full flex-col justify-between gap-8">
            <div className="space-y-4">
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
                Shared taste, softer edges
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="surface-inline-soft rounded-[28px] p-5">
                  <p className="text-[16px] font-semibold tracking-[-0.03em] text-[var(--text)]">
                    Build a room around a night, a group, or a feeling.
                  </p>
                  <p className="mt-3 text-[14px] leading-6 text-[var(--text-soft)]">
                    Keep it small and personal. Frequency starts warm before it gets smart.
                  </p>
                </div>
                <div className="surface-inline-card rounded-[28px] p-5">
                  <p className="text-[16px] font-semibold tracking-[-0.03em] text-[var(--text)]">
                    Let people shape the mood together.
                  </p>
                  <p className="mt-3 text-[14px] leading-6 text-[var(--text-soft)]">
                    The point is not just playback. It&apos;s context, overlap, and a shared vibe.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-[1.1fr_0.9fr]">
              <div className="surface-inline-card rounded-[30px] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--text-faint)]">
                      Tonight&apos;s shape
                    </p>
                    <p className="mt-2 text-[20px] font-semibold tracking-[-0.04em] text-[var(--text)]">
                      Warm rooms. Real people. Better music context.
                    </p>
                  </div>
                  <div className="flex -space-x-3">
                    <div className="grid size-11 place-items-center rounded-full border-2 border-[rgba(7,9,14,0.88)] bg-[#d29d7b] text-sm font-semibold text-white">
                      JS
                    </div>
                    <div className="grid size-11 place-items-center rounded-full border-2 border-[rgba(7,9,14,0.88)] bg-[#8bb9d8] text-sm font-semibold text-white">
                      MY
                    </div>
                    <div className="grid size-11 place-items-center rounded-full border-2 border-[rgba(7,9,14,0.88)] bg-[#8bb89e] text-sm font-semibold text-white">
                      AR
                    </div>
                  </div>
                </div>
              </div>

              <div className="surface-inline-soft rounded-[30px] p-5">
                <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--text-faint)]">
                  First rooms
                </p>
                <ul className="mt-4 space-y-3 text-[14px] leading-6 text-[var(--text-soft)]">
                  <li>Late drive with friends</li>
                  <li>House party reset</li>
                  <li>Sunday recovery mix</li>
                </ul>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </main>
  );
}
