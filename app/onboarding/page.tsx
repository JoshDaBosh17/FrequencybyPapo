import { AuthGate } from "@/components/auth/auth-gate";
import { OnboardingFlow } from "@/components/frequency/onboarding-flow";

export default function OnboardingPage() {
  return (
    <AuthGate mode="onboarding">
      <OnboardingFlow />
    </AuthGate>
  );
}
