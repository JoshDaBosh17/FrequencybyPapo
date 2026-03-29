import { channelTree } from "@/lib/mock-data";
import { ChannelId, HomeInvite, Person, Room, Scenario } from "@/lib/types";
import { AvatarStack } from "./avatar-stack";
import { ChannelList } from "./channel-list";
import { EmptyStateCard } from "./empty-state-card";
import { GlassCard } from "./glass-card";
import { MetricRing } from "./metric-ring";
import { RoomCard } from "./room-card";
import { SectionHeader } from "./section-header";
import { SongRow } from "./song-row";
import { StatPill } from "./stat-pill";
import { TrendCard } from "./trend-card";

type HomeScreenProps = {
  scenario: Scenario;
};

export function HomeScreen({ scenario }: HomeScreenProps) {
  const { home, user, people } = scenario;
  const closePeople = people.filter((person) => person.id !== user.id).slice(0, 4);
  const leadSong = home.continueListening[0];
  const leadRoom = home.activeRooms[0];

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex items-start justify-between gap-4 px-1 pt-1">
        <div className="space-y-1">
          <p className="text-[28px] font-semibold tracking-[-0.04em] text-[var(--text)]">
            {home.greeting}
          </p>
          <p className="text-[14px] font-medium text-[var(--text-soft)]">{home.subtitle}</p>
        </div>
        <div
          className="grid size-11 shrink-0 place-items-center rounded-full text-sm font-semibold text-white shadow-sm"
          style={{ backgroundColor: user.color }}
        >
          {user.initials}
        </div>
      </div>

      <GlassCard strong className="overflow-hidden rounded-[28px] p-5 sm:p-6">
        <div className="space-y-5">
          <div>
            <p className="text-[20px] font-semibold tracking-[-0.03em] text-[var(--text)]">
              Your State
            </p>
            <p className="mt-2 text-[15px] leading-6 text-[var(--text-soft)]">{home.summary}</p>
          </div>
          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[24px] border border-[var(--line)] bg-[linear-gradient(135deg,rgba(255,255,255,0.88),rgba(249,243,236,0.8))] p-4 sm:p-5">
              <div className="flex flex-col gap-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">
                      What your listening feels like
                    </p>
                    <p className="max-w-[28rem] text-[18px] font-semibold leading-7 tracking-[-0.03em] text-[var(--text)]">
                      {leadSong
                        ? `${leadSong.title} is pulling you toward a warmer, more social lane tonight.`
                        : "Your first few songs will shape the tone of everything that follows."}
                    </p>
                  </div>
                  <ArtworkCluster songs={home.continueListening} />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {home.stateMetrics.map((metric) => (
                    <div
                      key={metric.label}
                      className="rounded-[22px] border border-[var(--line)] bg-white/70 p-4"
                    >
                      <MetricRing metric={metric} size="sm" />
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {closePeople.length ? (
                    <>
                      <AvatarStack people={closePeople} size="sm" />
                      <p className="text-[14px] leading-6 text-[var(--text-soft)]">
                        {closePeople[0]?.name}
                        {closePeople.length > 1 ? ` and ${closePeople.length - 1} others` : ""} are close to your current mood.
                      </p>
                    </>
                  ) : (
                    <p className="text-[14px] leading-6 text-[var(--text-soft)]">
                      Add people or rooms to make your state feel shared instead of solo.
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="rounded-[24px] border border-[var(--line)] bg-white/62 p-4">
              {leadSong ? (
                <div className="flex h-full flex-col justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="size-14 rounded-[18px]"
                      style={{
                        background: `linear-gradient(145deg, ${leadSong.artworkColor}, rgba(255,255,255,0.72))`,
                      }}
                    />
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">
                        Tonight&apos;s pull
                      </p>
                      <p className="truncate text-[17px] font-semibold text-[var(--text)]">
                        {leadSong.title}
                      </p>
                      <p className="truncate text-[14px] text-[var(--text-soft)]">{leadSong.artist}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[14px] font-medium text-[var(--text-soft)]">Best social context</p>
                      {leadRoom ? <StatPill>{leadRoom.name}</StatPill> : null}
                    </div>
                    <p className="text-[14px] leading-6 text-[var(--text-soft)]">
                      {leadRoom
                        ? `${leadSong.context}. ${leadRoom.name} feels like the easiest place to keep this mood going.`
                        : "Add friends or favorite artists to make your state feel more social."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-col justify-between gap-4">
                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">
                      Starting point
                    </p>
                    <p className="mt-2 text-[18px] font-semibold text-[var(--text)]">
                      Begin with a song, artist, or friend.
                    </p>
                  </div>
                  <p className="text-[14px] leading-6 text-[var(--text-soft)]">
                    Frequency feels alive fastest when it has one musical anchor and one person to relate it to.
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="min-h-12 rounded-full bg-[var(--text)] px-5 text-[15px] font-medium text-white">
              See insights
            </button>
            <button className="min-h-12 rounded-full border border-[var(--line)] bg-white/75 px-5 text-[15px] font-medium text-[var(--text-soft)]">
              Play for your mood
            </button>
          </div>
        </div>
      </GlassCard>

      {home.shifts.length > 0 ? (
        <section className="space-y-3">
          <SectionHeader title="Moments around you" />
          <div className="soft-scrollbar flex gap-3 overflow-x-auto pb-1">
            {home.shifts.map((shift) => (
              <TrendCard key={shift.id} trend={shift} compact />
            ))}
          </div>
        </section>
      ) : null}

      {home.empty && home.invites?.length ? (
        <section className="space-y-3">
          <EmptyStateCard
            title="Your music world starts here."
            body="Add a few artists, join a room, or invite a friend. Frequency will turn that first signal into shared context and gentle insight."
            primaryAction="Add artists"
            secondaryAction="Join a room"
            eyebrow="Home"
            visual="music"
          />
          {home.invites.map((invite) => (
            <InviteCard key={invite.id} invite={invite} />
          ))}
        </section>
      ) : (
        <>
          <section className="space-y-3">
            <SectionHeader title="Continue listening" />
            <div className="space-y-3">
              {home.continueListening.map((song) => (
                <SongRow key={song.id} song={song} affordance="play" />
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <SectionHeader title="Rooms moving tonight" />
            <div className="grid gap-3 md:grid-cols-2">
              {home.activeRooms.map((room) => (
                <RoomCard key={room.id} room={room} people={people} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function InviteCard({ invite }: { invite: HomeInvite }) {
  return (
    <GlassCard className="p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <p className="text-[18px] font-semibold tracking-[-0.03em] text-[var(--text)]">
            {invite.title}
          </p>
          <p className="max-w-[38rem] text-[15px] leading-6 text-[var(--text-soft)]">
            {invite.body}
          </p>
        </div>
        <button className="min-h-12 shrink-0 rounded-full bg-[var(--text)] px-5 text-[15px] font-medium text-white">
          {invite.cta}
        </button>
      </div>
    </GlassCard>
  );
}

type RoomsScreenProps = {
  scenario: Scenario;
  selectedRoomId?: string;
  onRoomChange: (roomId: string) => void;
  selectedChannel: ChannelId;
  onChannelChange: (channel: ChannelId) => void;
};

export function RoomsScreen({
  scenario,
  selectedRoomId,
  onRoomChange,
  selectedChannel,
  onChannelChange,
}: RoomsScreenProps) {
  const rooms = scenario.rooms;
  const selectedRoom = rooms.find((room) => room.id === selectedRoomId) ?? rooms[0];

  if (!rooms.length) {
    return (
      <div className="space-y-5 sm:space-y-6">
        <EmptyStateCard
          title="No rooms yet"
          body="Rooms are where music becomes social. Create one for friends, events, or a shared vibe."
          primaryAction="Create a room"
          secondaryAction="Join with a link"
          eyebrow="Rooms"
          visual="rooms"
        />
        <div className="grid gap-3 md:grid-cols-3">
          <TrendCard
            trend={{
              id: "edu-1",
              title: "Build a room around a genre",
              detail: "Start with House, Afro House, Rap, or Chill and let the room evolve.",
            }}
          />
          <TrendCard
            trend={{
              id: "edu-2",
              title: "Invite without friction",
              detail: "You can bring people in before deciding on a deeper setup flow.",
            }}
          />
          <TrendCard
            trend={{
              id: "edu-3",
              title: "Track how the room changes",
              detail: "Rooms become more useful as people add songs and shape the mix together.",
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      <div className="space-y-4">
        <GlassCard className="hidden p-4 lg:block">
          <div className="space-y-3">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">
              Your spaces
            </p>
            <p className="text-[16px] font-semibold tracking-[-0.03em] text-[var(--text)]">
              Pick a room by vibe, people, or what you want to play next.
            </p>
          </div>
        </GlassCard>
        <div className="soft-scrollbar flex gap-3 overflow-x-auto pb-1 lg:flex-col">
          {rooms.map((room) => (
            <div key={room.id} className="min-w-[270px] lg:min-w-0">
              <RoomCard
                room={room}
                people={scenario.people}
                compact
                selected={selectedRoom?.id === room.id}
                onClick={() => onRoomChange(room.id)}
              />
            </div>
          ))}
        </div>
        <div className="hidden lg:block">
          <ChannelList channels={channelTree} value={selectedChannel} onChange={onChannelChange} />
        </div>
      </div>

      {selectedRoom ? (
        <div className="space-y-4">
          <RoomHeader room={selectedRoom} people={scenario.people} />
          <div className="lg:hidden">
            <ChannelList channels={channelTree} value={selectedChannel} onChange={onChannelChange} />
          </div>
          {selectedChannel === "insights" ? (
            <InsightsScreen room={selectedRoom} lowData={scenario.id === "low-data-insights"} />
          ) : (
            <RoomOverviewScreen
              room={selectedRoom}
              people={scenario.people}
              channel={selectedChannel}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

function RoomHeader({ room, people }: { room: Room; people: Person[] }) {
  const roomPeople = people.filter((person) => room.memberIds.includes(person.id)).slice(0, 4);
  const roomLeadSong = room.topSongs[0];

  return (
    <GlassCard strong className="min-h-[120px] rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div
              className="grid size-14 place-items-center rounded-[20px] text-sm font-semibold text-white"
              style={{ backgroundColor: room.accent }}
            >
              {room.icon}
            </div>
            <div>
              <p className="text-[24px] font-semibold tracking-[-0.04em] text-[var(--text)]">
                {room.name}
              </p>
              <p className="text-[15px] leading-6 text-[var(--text-soft)]">{room.description}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <AvatarStack people={roomPeople} />
            <StatPill>{room.descriptor}</StatPill>
            {room.liveLabel ? <StatPill>{room.liveLabel}</StatPill> : null}
          </div>
          <div className="grid gap-3 md:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[22px] border border-[var(--line)] bg-white/62 p-4">
              <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">
                Room mood
              </p>
              <p className="mt-2 text-[15px] leading-6 text-[var(--text-soft)]">
                {roomLeadSong
                  ? `${roomLeadSong.title} is setting the tone right now, and the room still feels most connected around ${room.descriptor.toLowerCase()}.`
                  : "This room is ready for its first shared song and first shared mood."}
              </p>
            </div>
            <div className="rounded-[22px] border border-[var(--line)] bg-white/62 p-4">
              {roomLeadSong ? (
                <div className="flex items-center gap-3">
                  <div
                    className="size-14 rounded-[18px]"
                    style={{
                      background: `linear-gradient(145deg, ${roomLeadSong.artworkColor}, rgba(255,255,255,0.72))`,
                    }}
                  />
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">
                      Playing through the room
                    </p>
                    <p className="truncate text-[17px] font-semibold text-[var(--text)]">
                      {roomLeadSong.title}
                    </p>
                    <p className="truncate text-[14px] text-[var(--text-soft)]">{roomLeadSong.artist}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">
                    First track
                  </p>
                  <p className="text-[15px] leading-6 text-[var(--text-soft)]">
                    Add one song and this room immediately becomes playable.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="min-h-12 rounded-full bg-[var(--text)] px-5 text-[15px] font-medium text-white">
            Invite
          </button>
          <button className="min-h-12 rounded-full border border-[var(--line)] bg-white/80 px-5 text-[15px] font-medium text-[var(--text-soft)]">
            Share room
          </button>
        </div>
      </div>
    </GlassCard>
  );
}

function RoomOverviewScreen({
  room,
  people,
  channel,
}: {
  room: Room;
  people: Person[];
  channel: ChannelId;
}) {
  const channelTitle =
    channel === "overview"
      ? "Room overview"
      : channel === "songs"
        ? "Songs"
        : channel === "people"
          ? "People"
          : `${channel.replace("-", " ")} channel`;

  return (
    <div className="space-y-4">
      <GlassCard strong className="min-h-[190px] rounded-[28px] p-5 sm:p-6">
        <div className="flex h-full flex-col justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <StatPill>{channelTitle}</StatPill>
            </div>
            <p className="text-[26px] font-semibold tracking-[-0.04em] text-[var(--text)]">
              {room.name}
            </p>
            <p className="max-w-[42rem] text-[15px] leading-7 text-[var(--text-soft)]">
              {room.empty
                ? "This room is ready for its first signal. Start with one song, one person, or one genre channel and let the room take shape."
                : `${room.overviewStats[1]}. ${room.topSongs[0]?.title ?? "The room"} is helping the group settle into a shared lane without losing discovery.`}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <AvatarStack
                people={people.filter((person) => room.memberIds.includes(person.id)).slice(0, 4)}
                size="sm"
              />
              <StatPill>{room.overviewStats[0]}</StatPill>
              <StatPill>{room.overviewStats[2]}</StatPill>
            </div>
            {!room.empty && room.topSongs[0] ? (
              <div className="rounded-[22px] border border-[var(--line)] bg-white/62 p-4">
                <div className="flex items-center gap-3">
                  <div
                    className="size-14 rounded-[18px]"
                    style={{
                      background: `linear-gradient(145deg, ${room.topSongs[0].artworkColor}, rgba(255,255,255,0.72))`,
                    }}
                  />
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">
                      Leading the room right now
                    </p>
                    <p className="truncate text-[17px] font-semibold text-[var(--text)]">
                      {room.topSongs[0].title}
                    </p>
                    <p className="truncate text-[14px] text-[var(--text-soft)]">
                      {room.topSongs[0].artist} • {room.topSongs[0].context}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="min-h-12 rounded-full bg-[var(--text)] px-5 text-[15px] font-medium text-white">
              Play room
            </button>
            <button className="min-h-12 rounded-full border border-[var(--line)] bg-white/80 px-5 text-[15px] font-medium text-[var(--text-soft)]">
              Invite
            </button>
            <button className="min-h-12 rounded-full border border-[var(--line)] bg-white/80 px-5 text-[15px] font-medium text-[var(--text-soft)]">
              Open insights
            </button>
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-3 md:grid-cols-3">
        {room.pulseMetrics.map((metric) => (
          <GlassCard key={metric.label} className="p-4">
            <div className="space-y-3">
              <MetricRing metric={metric} size="sm" />
              <p className="text-[14px] leading-6 text-[var(--text-soft)]">{metric.detail}</p>
            </div>
          </GlassCard>
        ))}
      </div>

      {room.empty ? (
        <>
          <EmptyStateCard
            title="This room is ready for its first signal."
            body="Add the first songs, invite people, or start with a genre channel. Everything here is ready to become social."
            primaryAction="Add the first songs"
            secondaryAction="Invite people"
            eyebrow="Room Overview"
            visual="rooms"
          />
          <EmptyOverviewVisual room={room} />
        </>
      ) : null}

      <section className="space-y-3">
        <SectionHeader title="What is changing here" />
        <div className="grid gap-3 md:grid-cols-3">
          {room.trends.map((trend) => (
            <TrendCard key={trend.id} trend={trend} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader title="Top songs in room" />
        <div className="space-y-3">
          {room.topSongs.length ? (
            room.topSongs.map((song) => <SongRow key={song.id} song={song} expanded affordance="chevron" />)
          ) : (
            <GlassCard className="p-5">
              <p className="text-[15px] leading-6 text-[var(--text-soft)]">
                No songs yet. Add a few tracks to make the room playable and unlock overlap signals.
              </p>
            </GlassCard>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader title="Genre preview" />
        <GlassCard className="p-5">
          <div className="space-y-4">
            {room.distribution.map((item) => (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[14px] font-medium text-[var(--text)]">{item.label}</p>
                  <p className="text-[13px] font-medium text-[var(--text-soft)]">{item.value}%</p>
                </div>
                <div className="h-2 rounded-full bg-[rgba(81,68,56,0.08)]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${item.value}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </section>

      {channel === "people" ? (
        <section className="space-y-3">
          <SectionHeader title="People in room" />
          <div className="grid gap-3 md:grid-cols-2">
            {people
              .filter((person) => room.memberIds.includes(person.id))
              .map((person) => (
                <GlassCard key={person.id} className="flex items-center gap-4 p-4">
                  <div
                    className="grid size-12 place-items-center rounded-full text-sm font-semibold text-white"
                    style={{ backgroundColor: person.color }}
                  >
                    {person.initials}
                  </div>
                  <div>
                    <p className="text-[16px] font-semibold text-[var(--text)]">{person.name}</p>
                    <p className="text-[14px] text-[var(--text-soft)]">Shapes the room energy</p>
                  </div>
                </GlassCard>
              ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export function InsightsScreen({
  room,
  lowData,
}: {
  room: Room;
  lowData?: boolean;
}) {
  const metrics = [
    { label: "Cohesion", value: room.pulseMetrics[0]?.value ?? 0, color: "#d9a85e", detail: "Room alignment" },
    { label: "Variety", value: room.pulseMetrics[2]?.value ?? 0, color: "#8bb9d8", detail: "Range of sounds" },
    { label: "Momentum", value: room.pulseMetrics[1]?.value ?? 0, color: "#82bb9c", detail: "Recent movement" },
  ];

  return (
    <div className="space-y-4">
      <GlassCard strong className="rounded-[28px] p-5 sm:p-6">
        <div className="space-y-5">
          <div>
            <p className="text-[20px] font-semibold tracking-[-0.03em] text-[var(--text)]">
              Room Insights
            </p>
            <p className="mt-2 text-[15px] leading-6 text-[var(--text-soft)]">
              {lowData
                ? "Insights appear once people start shaping the room."
                : "This room is highly cohesive but still discovering new sounds."}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-[24px] border border-[var(--line)] bg-white/62 p-4"
              >
                <MetricRing metric={metric} size="md" />
              </div>
            ))}
          </div>
        </div>
      </GlassCard>

      {lowData || room.empty ? (
        <EmptyStateCard
          title="Insights appear once music starts flowing."
          body="Add songs or invite people to unlock room trends, taste comparisons, and weekly recaps."
          primaryAction="Add songs"
          secondaryAction="Invite people"
          eyebrow="Insights"
          visual="insights"
        />
      ) : null}

      <section className="space-y-3">
        <SectionHeader title="Trends" />
        <div className="grid gap-3 md:grid-cols-3">
          {room.trends.map((trend) => (
            <TrendCard key={trend.id} trend={trend} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader title="You vs Room" />
        <GlassCard className="p-5">
          <div className="space-y-4">
            {room.comparison.map((row) => (
              <div key={row.label} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[14px] font-medium text-[var(--text)]">{row.label}</p>
                  <p className="text-[13px] font-medium text-[var(--text-soft)]">
                    {describeComparison(row.user, row.room)}
                  </p>
                </div>
                <div className="grid gap-2">
                  <div className="h-2 rounded-full bg-[rgba(233,135,143,0.12)]">
                    <div className="h-full rounded-full bg-[var(--genre-rose)]" style={{ width: `${row.user}%` }} />
                  </div>
                  <div className="h-2 rounded-full bg-[rgba(130,187,156,0.12)]">
                    <div className="h-full rounded-full bg-[var(--genre-mint)]" style={{ width: `${row.room}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </section>

      <section className="space-y-3">
        <SectionHeader title="Weekly recap" />
        <GlassCard className="p-5 sm:p-6">
          <p className="text-[15px] leading-7 text-[var(--text-soft)]">{room.recap}</p>
        </GlassCard>
      </section>
    </div>
  );
}

export function CompareScreen({ scenario }: { scenario: Scenario }) {
  const compareRoom = scenario.rooms.find((room) => !room.empty) ?? scenario.rooms[0];

  return (
    <div className="space-y-5 sm:space-y-6">
      <GlassCard strong className="rounded-[28px] p-5 sm:p-6">
        <div className="space-y-3">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
            Compare
          </p>
          <p className="text-[30px] font-semibold tracking-[-0.05em] text-[var(--text)]">
            Compare with someone
          </p>
          <p className="max-w-2xl text-[15px] leading-7 text-[var(--text-soft)]">
            The next version of Frequency centers overlap, contrast, and shared taste instead of a dedicated playback page.
          </p>
        </div>
      </GlassCard>

      {compareRoom ? (
        <GlassCard className="p-5 sm:p-6">
          <p className="text-[18px] font-semibold tracking-[-0.03em] text-[var(--text)]">
            Placeholder comparison target
          </p>
          <p className="mt-2 text-[14px] leading-6 text-[var(--text-soft)]">
            {compareRoom.name} is ready to become the first comparison surface once shared overlap views are built.
          </p>
        </GlassCard>
      ) : null}

      <EmptyStateCard
        title="Comparison tools are coming next"
        body="This area will soon let you compare your taste with a friend, room, or shared listening context."
        primaryAction="Open Home"
        secondaryAction="Explore Rooms"
        eyebrow="Compare"
        visual="insights"
      />
    </div>
  );
}

export function ProfileScreen({ scenario }: { scenario: Scenario }) {
  const { profile, user } = scenario;

  return (
    <div className="space-y-5 sm:space-y-6">
      <GlassCard strong className="rounded-[28px] p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div
              className="grid size-16 place-items-center rounded-full text-base font-semibold text-white"
              style={{ backgroundColor: user.color }}
            >
              {user.initials}
            </div>
            <div className="space-y-1">
              <p className="text-[24px] font-semibold tracking-[-0.04em] text-[var(--text)]">
                {user.name}
              </p>
              <p className="text-[15px] text-[var(--text-soft)]">{profile.descriptor}</p>
            </div>
          </div>
          <button className="min-h-12 rounded-full border border-[var(--line)] bg-white/80 px-5 text-[15px] font-medium text-[var(--text-soft)]">
            Edit profile
          </button>
        </div>
      </GlassCard>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {profile.stats.map((stat) => (
          <GlassCard key={stat.label} className="p-4">
            <p className="text-[13px] font-medium text-[var(--text-faint)]">{stat.label}</p>
            <p className="mt-3 text-[20px] font-semibold tracking-[-0.03em] text-[var(--text)]">
              {stat.value}
            </p>
          </GlassCard>
        ))}
      </div>

      {profile.empty ? (
        <section className="space-y-3">
          <EmptyStateCard
            title="Set up your music identity"
            body="Add favorite artists, create your first room, or invite a friend to compare taste."
            primaryAction="Add favorite artists"
            secondaryAction="Create your first room"
            eyebrow="Profile"
            visual="music"
          />
        </section>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-3">
          <SectionHeader title="Your trends" />
          <div className="space-y-3">
            {profile.trends.length ? (
              profile.trends.map((trend) => <TrendCard key={trend.id} trend={trend} />)
            ) : (
              <GlassCard className="p-5">
                <p className="text-[15px] leading-6 text-[var(--text-soft)]">
                  Trends will appear once you add more signal across rooms and songs.
                </p>
              </GlassCard>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <SectionHeader title="Top channels" />
          <GlassCard className="p-5">
            <div className="flex flex-wrap gap-2">
              {profile.topChannels.length ? (
                profile.topChannels.map((channel) => <StatPill key={channel}>{channel}</StatPill>)
              ) : (
                <p className="text-[15px] leading-6 text-[var(--text-soft)]">
                  Join a room to start building your channel footprint.
                </p>
              )}
            </div>
          </GlassCard>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-3">
          <SectionHeader title="Recent additions" />
          <div className="space-y-3">
            {profile.recentAdditions.length ? (
              profile.recentAdditions.map((song) => <SongRow key={song.id} song={song} affordance="chevron" />)
            ) : (
              <GlassCard className="p-5">
                <p className="text-[15px] leading-6 text-[var(--text-soft)]">
                  Start adding songs to build your identity and room suggestions.
                </p>
              </GlassCard>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <SectionHeader title="People closest to your taste" />
          <div className="space-y-3">
            {profile.overlaps.length ? (
              profile.overlaps.map((overlap) => (
                <GlassCard key={overlap.name} className="flex items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="grid size-11 place-items-center rounded-full text-sm font-semibold text-white"
                      style={{ backgroundColor: overlap.color }}
                    >
                      {overlap.name.slice(0, 2).toUpperCase()}
                    </div>
                    <p className="text-[15px] font-semibold text-[var(--text)]">{overlap.name}</p>
                  </div>
                  <p className="text-[14px] font-medium text-[var(--text-soft)]">{overlap.value}</p>
                </GlassCard>
              ))
            ) : (
              <GlassCard className="p-5">
                <p className="text-[15px] leading-6 text-[var(--text-soft)]">
                  Invite a friend to start comparing taste and unlock overlap suggestions.
                </p>
              </GlassCard>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function describeComparison(user: number, room: number) {
  const diff = user - room;

  if (Math.abs(diff) < 6) {
    return "You and the room are closely aligned";
  }

  return diff > 0 ? "You lean a little stronger here" : "The room leans a little stronger here";
}

function ArtworkCluster({
  songs,
}: {
  songs: Scenario["home"]["continueListening"];
}) {
  const visible = songs.slice(0, 3);

  if (!visible.length) {
    return (
      <div className="relative h-[74px] w-[110px] shrink-0">
        <div className="absolute left-0 top-3 size-14 rounded-[18px] border border-[var(--line)] bg-white/70" />
        <div className="absolute left-8 top-0 size-16 rounded-[20px] border border-[var(--line)] bg-[rgba(233,135,143,0.18)]" />
        <div className="absolute bottom-0 right-0 size-14 rounded-[18px] border border-[var(--line)] bg-[rgba(130,187,156,0.2)]" />
      </div>
    );
  }

  return (
    <div className="relative h-[74px] w-[110px] shrink-0">
      {visible.map((song, index) => (
        <div
          key={song.id}
          className="absolute rounded-[18px] border border-white/70 shadow-sm"
          style={{
            width: index === 1 ? 64 : 56,
            height: index === 1 ? 64 : 56,
            left: index === 0 ? 0 : index === 1 ? 26 : 58,
            top: index === 0 ? 14 : index === 1 ? 0 : 18,
            background: `linear-gradient(145deg, ${song.artworkColor}, rgba(255,255,255,0.8))`,
            transform: `rotate(${index === 0 ? -7 : index === 2 ? 7 : 0}deg)`,
          }}
        />
      ))}
    </div>
  );
}

function EmptyOverviewVisual({ room }: { room: Room }) {
  return (
    <GlassCard className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative h-[90px] w-[130px] shrink-0">
          <div className="absolute left-0 top-5 size-16 rounded-[22px] border border-[var(--line)] bg-white/70" />
          <div
            className="absolute left-8 top-0 size-20 rounded-[24px]"
            style={{ background: `linear-gradient(145deg, ${room.accent}, rgba(255,255,255,0.8))` }}
          />
          <div className="absolute bottom-0 right-0 size-16 rounded-[22px] border border-[var(--line)] bg-[rgba(130,187,156,0.2)]" />
        </div>
        <div className="space-y-2">
          <p className="text-[18px] font-semibold tracking-[-0.03em] text-[var(--text)]">
            Start with a room mood, not a full plan.
          </p>
          <p className="text-[15px] leading-6 text-[var(--text-soft)]">
            One song, one genre channel, or one friend is enough to make this room feel real.
          </p>
        </div>
      </div>
    </GlassCard>
  );
}
