"use client";

import { startTransition, useState, useTransition } from "react";

import { useAuth } from "@/components/providers/auth-provider";

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24">
      <path
        d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.7h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.2c1.9-1.8 3.1-4.4 3.1-7.4Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 5-1 6.7-2.6l-3.2-2.6a6.1 6.1 0 0 1-9-3.2H3.2v2.7A10 10 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.5 13.6a6.2 6.2 0 0 1 0-3.2V7.7H3.2a10 10 0 0 0 0 8.9l3.3-3Z"
        fill="#FBBC04"
      />
      <path
        d="M12 6a5.4 5.4 0 0 1 3.8 1.5l2.8-2.8A9.8 9.8 0 0 0 3.2 7.7l3.3 2.7A6 6 0 0 1 12 6Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function GoogleSignInButton() {
  const { signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [pending, startAuthTransition] = useTransition();

  function handleSignIn() {
    setError(null);
    startAuthTransition(() => {
      startTransition(async () => {
        try {
          await signIn();
        } catch {
          setError("Google sign-in did not finish. Please try again.");
        }
      });
    });
  }

  return (
    <div className="space-y-3">
      <button
        className="inline-flex min-h-13 w-full items-center justify-center gap-3 rounded-full bg-[var(--text)] px-6 text-[15px] font-medium text-white transition hover:opacity-95 disabled:opacity-70"
        disabled={pending}
        onClick={handleSignIn}
        type="button"
      >
        <GoogleMark />
        {pending ? "Opening Google" : "Continue with Google"}
      </button>
      {error ? <p className="text-[13px] text-[#aa5c5c]">{error}</p> : null}
    </div>
  );
}
