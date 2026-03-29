import type { DocumentReference, SetOptions } from "firebase-admin/firestore";

import { removeUndefinedDeep } from "@/lib/firebase/sanitize";
import { analyzeFirestoreWrite, recordWriteTrigger } from "@/lib/firebase/write-audit";

type AdminWriteContext = {
  triggerReason: string;
  userId?: string | null;
  writeType?: string;
};

function logWriteFailure(path: string, payload: unknown, error: unknown) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.error("[frequency][firestore-write-failed]", {
    path,
    payload,
    error: error instanceof Error ? error.message : error,
  });
}

function logWriteEvent(params: {
  ref: DocumentReference;
  payload: unknown;
  context?: AdminWriteContext;
  meaningfullyChanged: boolean;
  executed: boolean;
}) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  const summary = recordWriteTrigger(
    params.context?.triggerReason ?? "unspecified",
    params.executed,
  );

  console.log("[frequency][firestore-write]", {
    write_type: params.context?.writeType ?? "admin_set",
    collection_path: params.ref.parent.path,
    doc_id: params.ref.id,
    trigger_reason: params.context?.triggerReason ?? "unspecified",
    user_id: params.context?.userId ?? null,
    timestamp: new Date().toISOString(),
    meaningfully_changed: params.meaningfullyChanged,
    executed: params.executed,
    trigger_count: summary.triggerCount,
    top_triggers: summary.topTriggers,
    payload: params.payload,
  });
}

export async function setAdminDocument(
  ref: DocumentReference,
  payload: Record<string, unknown>,
  options?: SetOptions,
  context?: AdminWriteContext,
) {
  const cleanedPayload = removeUndefinedDeep(payload);
  const snapshot = await ref.get();
  const analysis = analyzeFirestoreWrite(snapshot.data() ?? null, cleanedPayload);

  logWriteEvent({
    ref,
    payload: cleanedPayload,
    context,
    meaningfullyChanged: analysis.meaningfullyChanged,
    executed: !snapshot.exists || analysis.meaningfullyChanged || !analysis.hasComparablePayload,
  });

  if (snapshot.exists && !analysis.meaningfullyChanged && analysis.hasComparablePayload) {
    return;
  }

  try {
    if (options) {
      await ref.set(cleanedPayload, options);
      return;
    }

    await ref.set(cleanedPayload);
  } catch (error) {
    logWriteFailure(ref.path, cleanedPayload, error);
    throw error;
  }
}
