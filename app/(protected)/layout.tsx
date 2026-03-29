import { AuthGate } from "@/components/auth/auth-gate";
import { ProtectedAppShell } from "@/components/frequency/protected-app-shell";
import { GlobalPlayerProvider } from "@/components/providers/global-player-provider";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate mode="protected">
      <GlobalPlayerProvider>
        <ProtectedAppShell>{children}</ProtectedAppShell>
      </GlobalPlayerProvider>
    </AuthGate>
  );
}
