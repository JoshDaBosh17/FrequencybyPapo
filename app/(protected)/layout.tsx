import { AuthGate } from "@/components/auth/auth-gate";
import { ProtectedAppShell } from "@/components/frequency/protected-app-shell";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate mode="protected">
      <ProtectedAppShell>{children}</ProtectedAppShell>
    </AuthGate>
  );
}
