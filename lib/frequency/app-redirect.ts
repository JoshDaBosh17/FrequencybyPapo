const DEFAULT_POST_ONBOARDING_PATH = "/home";

export function getSafeAppRedirectPath(
  path: string | null | undefined,
  fallback = DEFAULT_POST_ONBOARDING_PATH,
) {
  const trimmedPath = path?.trim();

  if (!trimmedPath || !trimmedPath.startsWith("/") || trimmedPath.startsWith("//")) {
    return fallback;
  }

  return trimmedPath;
}

export function buildOnboardingRedirectPath(path: string | null | undefined) {
  const safePath = getSafeAppRedirectPath(path);

  if (safePath === DEFAULT_POST_ONBOARDING_PATH) {
    return "/onboarding";
  }

  return `/onboarding?redirect=${encodeURIComponent(safePath)}`;
}
