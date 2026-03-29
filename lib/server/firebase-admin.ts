import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function parsePrivateKey() {
  const value = process.env.FIREBASE_PRIVATE_KEY;
  if (!value) {
    throw new Error("FIREBASE_PRIVATE_KEY is not set");
  }

  return value.replace(/\\n/g, "\n");
}

const adminApp =
  getApps().length > 0
    ? getApp()
    : initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: parsePrivateKey(),
        }),
      });

export const adminDb = getFirestore(adminApp, "default");
