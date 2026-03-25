import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  setPersistence,
  signInWithPopup,
} from "firebase/auth";

import { firebaseApp } from "./client";

export const auth = getAuth(firebaseApp);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

let persistencePromise: Promise<void> | null = null;

export function ensureAuthPersistence() {
  if (!persistencePromise) {
    persistencePromise = setPersistence(auth, browserLocalPersistence);
  }

  return persistencePromise;
}

export async function signInWithGoogle() {
  await ensureAuthPersistence();
  return signInWithPopup(auth, googleProvider);
}

export function signOutUser() {
  return auth.signOut();
}
