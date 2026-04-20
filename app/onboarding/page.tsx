import { AuthGate } from "@/components/auth/auth-gate";
import { OnboardingFlow } from "@/components/frequency/onboarding-flow";
import { getSafeAppRedirectPath } from "@/lib/frequency/app-redirect";

export default async function OnboardingPage(props: PageProps<"/onboarding">) {
  const searchParams = await props.searchParams;
  const redirectParam = searchParams.redirect;
  const redirectPath = getSafeAppRedirectPath(
    Array.isArray(redirectParam) ? redirectParam[0] : redirectParam,
  );

  return (
    <AuthGate mode="onboarding" onboardingCompleteRedirect={redirectPath}>
      <OnboardingFlow redirectPath={redirectPath} />
    </AuthGate>
  );
}
