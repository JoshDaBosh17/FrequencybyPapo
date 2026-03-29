"use client";

import { Hash, Plus, RadioTower } from "lucide-react";
import { useState } from "react";

import { ChannelIdentityHelix } from "./channel-identity-helix";

export function RoomChannelSidebar({
  roomName,
  roomVisibilityLabel,
  memberCountLabel,
  starterVibe,
  channels,
  channelVibes,
  selectedChannel,
  onSelectChannel,
  onCreateChannel,
}: {
  roomName: string;
  roomVisibilityLabel: string;
  memberCountLabel: string;
  starterVibe: string | null | undefined;
  channels: string[];
  channelVibes?: Record<string, string>;
  selectedChannel: string | null;
  onSelectChannel: (channel: string) => void;
  onCreateChannel: (channel: { name: string; vibe?: string }) => Promise<void>;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [channelVibe, setChannelVibe] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateChannel() {
    if (!channelName.trim()) {
      setError("Give the channel a name first.");
      return;
    }

    setPending(true);
    setError(null);

    try {
      await onCreateChannel({
        name: channelName,
        vibe: channelVibe,
      });
      setChannelName("");
      setChannelVibe("");
      setCreateOpen(false);
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : "We couldn't create the channel yet.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="section-haze-strong overflow-hidden rounded-[30px] p-4">
      <div className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--text-faint)]">
                {roomVisibilityLabel}
              </p>
              <p className="text-[18px] font-semibold tracking-[-0.03em] text-[var(--text)]">
                {roomName}
              </p>
              <p className="text-[12px] font-medium text-[var(--text-faint)]">{memberCountLabel}</p>
            </div>
            <button
              className="button-secondary grid size-10 place-items-center rounded-full"
              onClick={() => {
                setCreateOpen((current) => !current);
                setError(null);
                if (createOpen) {
                  setChannelName("");
                  setChannelVibe("");
                }
              }}
              type="button"
            >
              <Plus className="size-4" />
            </button>
          </div>
          <p className="text-[13px] leading-6 text-[var(--text-soft)]">
            {starterVibe
              ? `${starterVibe} is shaping the room identity.`
              : "Create channels that give songs, artists, and links a place to land."}
          </p>
        </div>

        {createOpen ? (
          <div className="section-haze rounded-[22px] p-3.5">
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">
                  New channel
                </p>
                <p className="text-[13px] leading-5 text-[var(--text-soft)]">
                  Add a music lane for songs, artists, or links.
                </p>
              </div>
              <input
                className="field-surface min-h-11 w-full rounded-[16px] px-3.5 text-[14px]"
                onChange={(event) => {
                  setChannelName(event.target.value);
                  setError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleCreateChannel();
                  }
                }}
                placeholder="House edits, warm-ups, afters..."
                value={channelName}
              />
              <input
                className="field-surface min-h-11 w-full rounded-[16px] px-3.5 text-[14px]"
                onChange={(event) => {
                  setChannelVibe(event.target.value);
                  setError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleCreateChannel();
                  }
                }}
                placeholder="Optional vibe: late-night house, glossy rap..."
                value={channelVibe}
              />
              {error ? <p className="text-[12px] text-[#d78b8b]">{error}</p> : null}
              <div className="flex gap-2">
                <button
                  className="button-primary min-h-10 rounded-full px-3.5 text-xs font-medium disabled:opacity-70"
                  disabled={pending}
                  onClick={() => void handleCreateChannel()}
                  type="button"
                >
                  {pending ? "Creating" : "Create channel"}
                </button>
                <button
                  className="button-secondary min-h-10 rounded-full px-3.5 text-xs font-medium"
                  onClick={() => {
                    setCreateOpen(false);
                    setError(null);
                    setChannelName("");
                    setChannelVibe("");
                  }}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">
            <RadioTower className="size-3.5" />
            Channels
          </div>

          {channels.length ? (
            <div className="space-y-1.5">
              {channels.map((channel) => {
                const isActive = selectedChannel === channel;
                const vibe = channelVibes?.[channel] ?? null;

                return (
                  <button
                    key={channel}
                    className={`flex min-h-14 w-full items-center gap-3 rounded-[18px] px-3 text-left transition ${
                      isActive
                        ? "bg-[rgba(255,255,255,0.06)] text-[var(--text)]"
                        : "text-[var(--text-soft)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--text)]"
                    }`}
                    onClick={() => onSelectChannel(channel)}
                    type="button"
                  >
                    <ChannelIdentityHelix
                      className="h-8 w-12 shrink-0"
                      genres={[vibe ?? channel, channel, starterVibe ?? channel]}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Hash className="size-3.5 shrink-0" />
                        <p className="truncate text-[14px] font-medium">{channel}</p>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] uppercase tracking-[0.08em] text-[var(--text-faint)]">
                        {vibe ? `${vibe} lane` : "Music channel"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="section-haze rounded-[22px] p-4">
              <div className="space-y-2">
                <p className="text-[14px] font-medium text-[var(--text)]">No channels yet</p>
                <p className="text-[13px] leading-5 text-[var(--text-soft)]">
                  Start the first channel so songs and artists have a place to live.
                </p>
                <button
                  className="button-secondary inline-flex min-h-9 items-center gap-2 rounded-full px-3 text-xs font-medium"
                  onClick={() => setCreateOpen(true)}
                  type="button"
                >
                  <Plus className="size-3.5" />
                  Create first channel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
