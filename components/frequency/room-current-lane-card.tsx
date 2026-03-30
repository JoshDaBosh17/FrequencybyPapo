"use client";

import { Hash } from "lucide-react";
import { useState } from "react";

import { formatCount } from "@/lib/utils";
import { TimelineAddMusicButton } from "./timeline-add-music-button";

function formatChannelLabel(channel: string) {
  return channel.trim().startsWith("#") ? channel.trim() : `#${channel.trim()}`;
}

export function RoomCurrentLaneCard({
  accentColor,
  activeChannel,
  channelActionError,
  channelSongCounts,
  channelVibes,
  channels,
  onAddMusic,
  onCreateChannel,
  onSelectChannel,
  selectedChannel,
  songCount,
}: {
  accentColor: string;
  activeChannel: string | null;
  channelActionError?: string | null;
  channelSongCounts?: Record<string, number>;
  channelVibes?: Record<string, string>;
  channels: string[];
  onAddMusic: () => void;
  onCreateChannel: (channel: { name: string; vibe?: string }) => Promise<void>;
  onSelectChannel: (channel: string) => void;
  selectedChannel: string | null;
  songCount: number;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [channelVibe, setChannelVibe] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleCreateChannel() {
    if (!channelName.trim()) {
      setCreateError("Give the channel a name first.");
      return;
    }

    setPending(true);
    setCreateError(null);

    try {
      await onCreateChannel({
        name: channelName,
        vibe: channelVibe.trim() || undefined,
      });
      setChannelName("");
      setChannelVibe("");
      setCreateOpen(false);
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : "We couldn't create the channel yet.",
      );
    } finally {
      setPending(false);
    }
  }

  const activeChannelLabel = activeChannel ? formatChannelLabel(activeChannel) : null;
  const activeChannelVibe = activeChannel ? channelVibes?.[activeChannel] ?? null : null;

  return (
    <section className="section-haze-strong overflow-hidden rounded-[32px] border border-[rgba(255,255,255,0.06)] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_42px_rgba(0,0,0,0.16)] sm:px-6 sm:py-6">
      <div className="space-y-5 sm:space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1.5">
            <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-[var(--text)]">
              Current Lane
            </h2>
            <p className="text-[14px] leading-6 text-[var(--text-soft)]">
              {activeChannelLabel
                ? `${activeChannelLabel}${activeChannelVibe ? ` • ${activeChannelVibe}` : ""} • ${formatCount(songCount, "song")} moving through this lane right now.`
                : "Create the first lane so songs in this room have a clear home."}
            </p>
          </div>
          <button
            className="button-secondary min-h-10 shrink-0 rounded-full px-3.5 text-xs font-medium"
            onClick={() => {
              setCreateOpen((current) => !current);
              setCreateError(null);
            }}
            type="button"
          >
            {createOpen ? "Close" : channels.length ? "New channel" : "Create channel"}
          </button>
        </div>

        {channels.length ? (
          <div className="flex gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {channels.map((channel) => {
              const isActive = selectedChannel === channel;
              const channelCount = channelSongCounts?.[channel] ?? 0;
              const channelVibeLabel = channelVibes?.[channel]?.trim() || null;

              return (
                <button
                  key={channel}
                  className={`min-w-[11.5rem] shrink-0 rounded-[20px] border px-3.5 py-3 text-left transition ${
                    isActive
                      ? "border-white/16 bg-white/[0.09] text-[var(--text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                      : "border-white/10 bg-white/[0.03] text-[var(--text-soft)] hover:border-white/14 hover:bg-white/[0.06] hover:text-[var(--text)]"
                  }`}
                  onClick={() => onSelectChannel(channel)}
                  type="button"
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full border ${
                        isActive
                          ? "border-white/14 bg-white/[0.08] text-[var(--text)]"
                          : "border-white/10 bg-white/[0.04] text-[var(--text-faint)]"
                      }`}
                    >
                      <Hash className="size-3.5" />
                    </span>
                    <div className="min-w-0 space-y-0.5">
                      <p className="truncate text-[14px] font-medium text-current">
                        {formatChannelLabel(channel)}
                      </p>
                      <p className="truncate text-[11.5px] text-[var(--text-faint)]">
                        {formatCount(channelCount, "song")}
                        {channelVibeLabel ? ` • ${channelVibeLabel}` : ""}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
            <div className="space-y-1.5">
              <p className="text-[14px] font-medium text-[var(--text)]">No channels yet</p>
              <p className="text-[13px] leading-5 text-[var(--text-soft)]">
                Start the first lane so songs, artists, and links have somewhere to land.
              </p>
            </div>
          </div>
        )}

        {createOpen ? (
          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-[13px] font-medium text-[var(--text)]">New channel</p>
                <p className="text-[12px] leading-5 text-[var(--text-soft)]">
                  Keep it simple. Name the lane, then optionally give it a vibe.
                </p>
              </div>
              <input
                className="field-surface min-h-11 w-full rounded-[16px] px-3.5 text-[14px]"
                onChange={(event) => {
                  setChannelName(event.target.value);
                  setCreateError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleCreateChannel();
                  }
                }}
                placeholder="Pregame, afters, warmup..."
                value={channelName}
              />
              <input
                className="field-surface min-h-11 w-full rounded-[16px] px-3.5 text-[14px]"
                onChange={(event) => {
                  setChannelVibe(event.target.value);
                  setCreateError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleCreateChannel();
                  }
                }}
                placeholder="Optional vibe"
                value={channelVibe}
              />
              {createError ? (
                <p className="text-[12px] leading-5 text-[#d78b8b]">{createError}</p>
              ) : null}
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
                    setCreateError(null);
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

        <div className="space-y-2 pt-1">
          <TimelineAddMusicButton
            accentColor={accentColor}
            disabled={!activeChannel}
            onClick={onAddMusic}
          />
          {channelActionError ? (
            <p className="text-[12px] leading-5 text-[#d7a0a0]">{channelActionError}</p>
          ) : null}
          {!activeChannel ? (
            <p className="text-[12px] leading-5 text-[var(--text-faint)]">
              Create or pick a lane before adding music.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
