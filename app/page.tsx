import { AuthGate } from "@/components/auth/auth-gate";
import { SignedOutScreen } from "@/components/auth/signed-out-screen";

export default function Page() {
  return (
    <AuthGate mode="public">
      <SignedOutScreen />
    </AuthGate>
  );
}
