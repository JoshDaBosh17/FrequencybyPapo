"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/providers/auth-provider";
import { createRoom } from "@/lib/firebase/firestore";
import { GlassCard } from "./glass-card";

type CreateRoomDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (roomId: string) => void;
  title?: string;
  description?: string;
};

export function CreateRoomDialog({
  open,
  onOpenChange,
  onCreated,
  title = "Create a room",
  description = "Start with a shared vibe, then let songs and people shape it together.",
}: CreateRoomDialogProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [roomName, setRoomName] = useState("");
  const [roomDescription, setRoomDescription] = useState("");
  const [starterVibe, setStarterVibe] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!open) {
    return null;
  }

  async function handleCreateRoom() {
    if (!user) {
      return;
    }

    if (!roomName.trim()) {
      setError("Give the room a name first.");
      return;
    }

    setPending(true);
    setError(null);

    try {
      const roomId = await createRoom({
        userId: user.uid,
        name: roomName,
        description: roomDescription,
        starterVibe,
      });

      onOpenChange(false);
      onCreated?.(roomId);
      router.push(`/rooms/${roomId}`);
    } catch {
      setError("The room did not save. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(32,29,26,0.24)] px-4 py-8 backdrop-blur-sm">
      <GlassCard strong className="w-full max-w-xl rounded-[32px] p-6 sm:p-7">
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
              Rooms
            </p>
            <h2 className="text-[28px] font-semibold tracking-[-0.05em] text-[var(--text)]">
              {title}
            </h2>
            <p className="text-[15px] leading-6 text-[var(--text-soft)]">{description}</p>
          </div>

          <div className="grid gap-4">
            <label className="space-y-2">
              <span className="text-[14px] font-medium text-[var(--text)]">Room name</span>
              <input
                className="min-h-12 w-full rounded-[20px] border border-[var(--line)] bg-white/80 px-4 text-[15px] text-[var(--text)] outline-none"
                onChange={(event) => setRoomName(event.target.value)}
                placeholder="Late drive, rooftop set, Sunday reset..."
                value={roomName}
              />
            </label>

            <label className="space-y-2">
              <span className="text-[14px] font-medium text-[var(--text)]">Short description</span>
              <textarea
                className="min-h-28 w-full rounded-[20px] border border-[var(--line)] bg-white/80 px-4 py-3 text-[15px] text-[var(--text)] outline-none"
                onChange={(event) => setRoomDescription(event.target.value)}
                placeholder="What kind of room is this, and who is it for?"
                value={roomDescription}
              />
            </label>

            <label className="space-y-2">
              <span className="text-[14px] font-medium text-[var(--text)]">Starter vibe</span>
              <input
                className="min-h-12 w-full rounded-[20px] border border-[var(--line)] bg-white/80 px-4 text-[15px] text-[var(--text)] outline-none"
                onChange={(event) => setStarterVibe(event.target.value)}
                placeholder="Optional: House, Rap, Chill..."
                value={starterVibe}
              />
            </label>
          </div>

          {error ? <p className="text-[13px] text-[#aa5c5c]">{error}</p> : null}

          <div className="flex flex-wrap gap-3">
            <button
              className="min-h-12 rounded-full bg-[var(--text)] px-5 text-[15px] font-medium text-white disabled:opacity-70"
              disabled={pending}
              onClick={() => void handleCreateRoom()}
              type="button"
            >
              {pending ? "Creating room" : "Create room"}
            </button>
            <button
              className="min-h-12 rounded-full border border-[var(--line)] bg-white/80 px-5 text-[15px] font-medium text-[var(--text-soft)]"
              onClick={() => onOpenChange(false)}
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
