"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";

import type { UserProfile } from "@/lib/types";
import { auth, ensureAuthPersistence, signInWithGoogle, signOutUser } from "@/lib/firebase/auth";
import { ensureUserProfile, observeUserProfile } from "@/lib/firebase/firestore";

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

  function buildFallbackProfile(nextUser: User): UserProfile {
    return {
      uid: nextUser.uid,
      displayName: nextUser.displayName ?? null,
      email: nextUser.email ?? null,
      photoURL: nextUser.photoURL ?? null,
      createdAt: null,
      onboardingComplete: false,
      favoriteArtists: [],
      joinedRoomIds: [],
    };
  }

  useEffect(() => {
    let unsubscribeProfile: () => void = () => {};

    void ensureAuthPersistence();

    const unsubscribeAuth = onAuthStateChanged(auth, async (nextUser) => {
      unsubscribeProfile();

      if (!nextUser) {
        setUser(null);
        setProfile(null);
        setDataError(null);
        setLoading(false);
        return;
      }

      setUser(nextUser);
      setLoading(true);
      setDataError(null);

      try {
        await ensureUserProfile(nextUser);
      } catch {
        setProfile(buildFallbackProfile(nextUser));
        setDataError(
          "Firestore is not available for this Firebase project yet. Google auth works, but profile and room persistence need Firestore enabled.",
        );
        setLoading(false);
        return;
      }

      unsubscribeProfile = observeUserProfile(nextUser.uid, (nextProfile) => {
        setProfile(nextProfile ?? buildFallbackProfile(nextUser));
        if (!nextProfile) {
          setDataError(
            "Firestore is not available for this Firebase project yet. Google auth works, but profile and room persistence need Firestore enabled.",
          );
        }
        setLoading(false);
      });
    });

    return () => {
      unsubscribeAuth();
      unsubscribeProfile();
    };
  }, []);

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
