"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";

import { IS_FREQUENCY_DEMO_MODE } from "@/lib/frequency/demo-mode";
import type { UserProfile } from "@/lib/types";
import { auth, ensureAuthPersistence, signInWithGoogle, signOutUser } from "@/lib/firebase/auth";
import { ensureUserProfile, observeUserProfile } from "@/lib/firebase/firestore";
import { useMountedRef } from "@/lib/use-mounted-ref";

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  dataError: string | null;
  signIn: typeof signInWithGoogle;
  signOut: typeof signOutUser;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const mountedRef = useMountedRef();

  function buildFallbackProfile(nextUser: User): UserProfile {
    return {
      uid: nextUser.uid,
      displayName: nextUser.displayName ?? null,
      email: nextUser.email ?? null,
      photoURL: nextUser.photoURL ?? null,
      friendIds: [],
      friendCode: null,
      friendCodeNormalized: null,
      createdAt: null,
      onboardingComplete: false,
      favoriteArtists: [],
      favoriteArtistEntries: [],
      favoriteArtistsSignature: null,
      joinedRoomIds: [],
      genreProfile: [],
      artistGenreProfiles: [],
      tasteSummary: null,
      homeSuggestion: null,
      activeRecommendationIntent: null,
      recommendationCache: {},
      enrichmentStatus: "idle",
      enrichmentError: null,
      lastEnrichedAt: null,
      recommendationEmptyStateReason: null,
      recommendationStatus: "idle",
      recommendationError: null,
      recommendationExpiresAt: null,
      recommendationFailedAt: null,
      openAIFallbackFailedAt: null,
    };
  }

  useEffect(() => {
    let unsubscribeProfile: () => void = () => {};

    void ensureAuthPersistence();

    const unsubscribeAuth = onAuthStateChanged(auth, async (nextUser) => {
      if (!mountedRef.current) {
        return;
      }

      unsubscribeProfile();

      if (!nextUser) {
        setUser(null);
        setProfile(null);
        setDataError(null);
        setLoading(false);
        return;
      }

      setUser(nextUser);
      setDataError(null);
      setProfile(buildFallbackProfile(nextUser));
      setLoading(!IS_FREQUENCY_DEMO_MODE);

      try {
        await ensureUserProfile(nextUser);
      } catch {
        if (!mountedRef.current) {
          return;
        }
        setProfile(buildFallbackProfile(nextUser));
        setDataError(
          "Profile, room, or enrichment data could not be loaded from Firestore right now.",
        );
        setLoading(false);
        return;
      }

      unsubscribeProfile = observeUserProfile(nextUser.uid, (nextProfile) => {
        if (!mountedRef.current) {
          return;
        }
        setProfile(nextProfile ?? buildFallbackProfile(nextUser));
        if (!nextProfile) {
          setDataError(
            "Profile, room, or enrichment data could not be loaded from Firestore right now.",
          );
        }
        setLoading(false);
      });
    });

    return () => {
      unsubscribeAuth();
      unsubscribeProfile();
    };
  }, [mountedRef]);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      dataError,
      signIn: signInWithGoogle,
      signOut: signOutUser,
    }),
    [dataError, loading, profile, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
