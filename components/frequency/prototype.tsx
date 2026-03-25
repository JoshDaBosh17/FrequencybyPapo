"use client";

import { useState } from "react";

import { defaultScenario, scenarios } from "@/lib/mock-data";
import { ChannelId, TabId } from "@/lib/types";
import { AppShell } from "./app-shell";
import { HomeScreen, PlayerScreen, ProfileScreen, RoomsScreen } from "./screens";

export function FrequencyPrototype() {
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [activeScenarioId, setActiveScenarioId] = useState(defaultScenario.id);
  const [selectedRoomId, setSelectedRoomId] = useState<string | undefined>(
    defaultScenario.rooms[0]?.id,
  );
  const [selectedChannel, setSelectedChannel] = useState<ChannelId>("overview");
  const [playerQueueTab, setPlayerQueueTab] = useState<"queue" | "related" | "room-picks">(
    "queue",
  );

  const scenario = scenarios.find((entry) => entry.id === activeScenarioId) ?? defaultScenario;

  function handleScenarioChange(nextScenarioId: string) {
    const nextScenario =
      scenarios.find((entry) => entry.id === nextScenarioId) ?? defaultScenario;

    setActiveScenarioId(nextScenarioId);
    setSelectedRoomId(nextScenario.rooms[0]?.id);
    setSelectedChannel("overview");
    setPlayerQueueTab("queue");
  }

  return (
    <AppShell
      activeScenario={activeScenarioId}
      activeTab={activeTab}
      onScenarioChange={handleScenarioChange}
      onTabChange={setActiveTab}
      scenarios={scenarios.map(({ id, label }) => ({ id, label }))}
      user={scenario.user}
    >
      {activeTab === "home" ? <HomeScreen scenario={scenario} /> : null}
      {activeTab === "rooms" ? (
        <RoomsScreen
          onChannelChange={setSelectedChannel}
          onRoomChange={setSelectedRoomId}
          scenario={scenario}
          selectedChannel={selectedChannel}
          selectedRoomId={selectedRoomId}
        />
      ) : null}
      {activeTab === "player" ? (
        <PlayerScreen
          onQueueTabChange={setPlayerQueueTab}
          player={scenario.player}
          queueTab={playerQueueTab}
        />
      ) : null}
      {activeTab === "profile" ? <ProfileScreen scenario={scenario} /> : null}
    </AppShell>
  );
}
