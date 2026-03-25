import { Person, TabId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BottomNav } from "./bottom-nav";
import { GlassCard } from "./glass-card";

type ScenarioOption = {
  id: string;
  label: string;
};

type AppShellProps = {
  children: React.ReactNode;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  scenarios: ScenarioOption[];
  activeScenario: string;
  onScenarioChange: (scenarioId: string) => void;
  user: Person;
};

export function AppShell({
  children,
  activeTab,
  onTabChange,
  scenarios,
  activeScenario,
  onScenarioChange,
  user,
}: AppShellProps) {
  return (
    <div className="pb-32">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-5 px-4 pt-4 sm:px-5 lg:px-8 lg:pt-6">
        <GlassCard strong className="overflow-hidden rounded-[28px] p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">
                Frequency Prototype
              </p>
              <p className="mt-1 text-[18px] font-semibold tracking-[-0.03em] text-[var(--text)]">
                Light glass social music system
              </p>
              <p className="mt-1 text-[14px] text-[var(--text-soft)]">
                Switch scenario states to preview populated and empty flows.
              </p>
            </div>
            <div className="flex items-center gap-3 self-start lg:self-auto">
              <div
                className="grid size-11 place-items-center rounded-full text-sm font-semibold text-white"
                style={{ backgroundColor: user.color }}
              >
                {user.initials}
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[var(--text)]">{user.name}</p>
                <p className="text-[13px] text-[var(--text-soft)]">Previewing app shell</p>
              </div>
            </div>
          </div>
          <div className="soft-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
            {scenarios.map((scenario) => {
              const active = scenario.id === activeScenario;
              return (
                <button
                  key={scenario.id}
                  className={cn(
                    "min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition",
                    active
                      ? "border-transparent bg-[var(--text)] text-white"
                      : "border-[var(--line)] bg-white/60 text-[var(--text-soft)]",
                  )}
                  onClick={() => onScenarioChange(scenario.id)}
                  type="button"
                >
                  {scenario.label}
                </button>
              );
            })}
          </div>
        </GlassCard>
        {children}
      </div>
      <BottomNav value={activeTab} onChange={onTabChange} />
    </div>
  );
}
