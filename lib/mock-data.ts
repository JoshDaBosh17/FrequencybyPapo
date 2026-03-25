import { ChannelId, Room, Scenario } from "@/lib/types";

export const channelTree: Array<{
  id: ChannelId;
  label: string;
  children?: Array<{ id: ChannelId; label: string }>;
}> = [
  { id: "overview", label: "Overview" },
  {
    id: "house",
    label: "Genres",
    children: [
      { id: "house", label: "House" },
      { id: "afro-house", label: "Afro House" },
      { id: "rap", label: "Rap" },
      { id: "chill", label: "Chill" },
    ],
  },
  { id: "people", label: "People" },
  { id: "songs", label: "Songs" },
  { id: "insights", label: "Insights" },
];

const people = {
  joshua: { id: "joshua", name: "Joshua", initials: "JS", color: "#d29d7b" },
  maya: { id: "maya", name: "Maya", initials: "MY", color: "#de8ea2" },
  tevin: { id: "tevin", name: "Tevin", initials: "TV", color: "#8bb9d8" },
  nina: { id: "nina", name: "Nina", initials: "NN", color: "#8bb89e" },
  ari: { id: "ari", name: "Ari", initials: "AR", color: "#b6a0db" },
  sol: { id: "sol", name: "Sol", initials: "SL", color: "#d9ab63" },
};

const songs = {
  flightFm: {
    id: "flight-fm",
    title: "Flight fm",
    artist: "Joy Orbison",
    album: "Single",
    duration: "4:04",
    context: "from Late Night room",
    artworkColor: "#d9a85e",
    addedBy: "Maya",
    youtubeId: "fOQor-yaDDE",
  },
  relaxMyEyes: {
    id: "relax-my-eyes",
    title: "Relax My Eyes",
    artist: "ANOTR & Abel Balder",
    album: "The Reset",
    duration: "3:21",
    context: "recommended from Maya + Josh overlap",
    artworkColor: "#8bb9d8",
    addedBy: "Joshua",
    youtubeId: "m4U232MuTG4",
  },
  location: {
    id: "location",
    title: "Location",
    artist: "Dave & Burna Boy",
    album: "We're All Alone In This Together",
    duration: "4:01",
    context: "autoplay for your current state",
    artworkColor: "#e9878f",
    addedBy: "Tevin",
    youtubeId: "4U2pDfx9I4Q",
  },
  adoreU: {
    id: "adore-u",
    title: "adore u",
    artist: "Fred again.. & Obongjayar",
    album: "ten days",
    duration: "3:43",
    context: "fits current room energy",
    artworkColor: "#82bb9c",
    addedBy: "Ari",
    youtubeId: "T2kDoX-BxGo",
  },
  freeMind: {
    id: "free-mind",
    title: "Free Mind",
    artist: "Tems",
    album: "If Orange Was a Place",
    duration: "4:10",
    context: "popular across House + Chill",
    artworkColor: "#aea0d9",
    addedBy: "Nina",
    youtubeId: "e8GzTXRAJ30",
  },
  move: {
    id: "move",
    title: "Move",
    artist: "Adam Port, Stryv",
    album: "Move",
    duration: "2:57",
    context: "added by Maya",
    artworkColor: "#d9a85e",
    addedBy: "Maya",
    youtubeId: "n3Dru5y3ROc",
  },
};

const rooms: Record<string, Room> = {
  lateNight: {
    id: "late-night",
    name: "Late Night",
    icon: "LN",
    description: "For late sessions, deeper cuts, and the songs that change after midnight.",
    memberIds: ["joshua", "maya", "tevin", "nina"],
    memberCountLabel: "8 members, 12 active this week",
    liveLabel: "live this week",
    descriptor: "Afro House leading",
    accent: "#d9a85e",
    overviewStats: [
      "12 listening this week",
      "Most shared: Afro House",
      "Top overlap: Kaytranada / Fred again.. / Drake",
    ],
    pulseMetrics: [
      { label: "Shared Taste", value: 72, color: "#d9a85e", detail: "+6 this week" },
      { label: "Activity", value: 64, color: "#82bb9c", detail: "5 new additions" },
      { label: "Freshness", value: 51, color: "#8bb9d8", detail: "2 first-time artists" },
    ],
    trends: [
      {
        id: "afro-house-rising",
        title: "Afro House rising",
        detail: "Room energy picked up after two Maya adds on Tuesday night.",
      },
      {
        id: "rap-cooling",
        title: "Rap cooling off",
        detail: "Fewer repeat plays this week as House moved into the lead.",
      },
      {
        id: "new-member-shift",
        title: "New member input changed the mix",
        detail: "Nina introduced softer cuts that widened the overlap range.",
      },
    ],
    topSongs: [songs.move, songs.relaxMyEyes, songs.adoreU, songs.freeMind],
    comparison: [
      { label: "Energy", user: 74, room: 69 },
      { label: "Familiarity", user: 58, room: 66 },
      { label: "Discovery", user: 71, room: 62 },
      { label: "Mood", user: 63, room: 78 },
      { label: "Tempo", user: 68, room: 73 },
    ],
    recap:
      "The room became more upbeat over the week, with Afro House staying dominant and later sessions pulling the group toward deeper, more percussive picks.",
    distribution: [
      { label: "Afro House", value: 38, color: "#d9a85e" },
      { label: "House", value: 27, color: "#82bb9c" },
      { label: "Chill", value: 19, color: "#8bb9d8" },
      { label: "Rap", value: 16, color: "#e9878f" },
    ],
  },
  fridayKickback: {
    id: "friday-kickback",
    name: "Friday Kickback",
    icon: "FK",
    description: "A social room for easy starts, pregame energy, and familiar favorites.",
    memberIds: ["joshua", "maya", "ari", "sol"],
    memberCountLabel: "6 members, 5 active this week",
    liveLabel: "steady",
    descriptor: "House + Chill balanced",
    accent: "#82bb9c",
    overviewStats: [
      "5 listening this week",
      "Most shared: House",
      "Top overlap: SZA / Drake / Tems",
    ],
    pulseMetrics: [
      { label: "Shared Taste", value: 66, color: "#82bb9c", detail: "stable" },
      { label: "Activity", value: 41, color: "#8bb9d8", detail: "lighter week" },
      { label: "Freshness", value: 57, color: "#aea0d9", detail: "3 new tracks" },
    ],
    trends: [
      {
        id: "chill-returned",
        title: "Chill returned",
        detail: "More mellow picks are landing earlier in the evening.",
      },
      {
        id: "friends-influence",
        title: "Friends influenced the queue",
        detail: "Most recent adds came from overlap recommendations.",
      },
    ],
    topSongs: [songs.location, songs.freeMind, songs.flightFm],
    comparison: [
      { label: "Energy", user: 74, room: 56 },
      { label: "Familiarity", user: 58, room: 71 },
      { label: "Discovery", user: 71, room: 44 },
      { label: "Mood", user: 63, room: 72 },
      { label: "Tempo", user: 68, room: 61 },
    ],
    recap:
      "Friday Kickback stayed familiar, but a few softer left turns kept the room from flattening out.",
    distribution: [
      { label: "House", value: 31, color: "#82bb9c" },
      { label: "Chill", value: 29, color: "#8bb9d8" },
      { label: "Rap", value: 22, color: "#e9878f" },
      { label: "Afro House", value: 18, color: "#d9a85e" },
    ],
  },
  empty: {
    id: "empty-room",
    name: "First Room",
    icon: "FR",
    description: "A clean room ready for its first songs, people, and genre channels.",
    memberIds: ["joshua"],
    memberCountLabel: "Just you for now",
    descriptor: "Ready for its first signal",
    accent: "#aea0d9",
    overviewStats: [
      "0 listening this week",
      "Most shared: Not enough data yet",
      "Top overlap: Waiting for members",
    ],
    pulseMetrics: [
      { label: "Shared Taste", value: 18, color: "#aea0d9", detail: "invite people" },
      { label: "Activity", value: 12, color: "#8bb9d8", detail: "add first songs" },
      { label: "Freshness", value: 22, color: "#d9a85e", detail: "start a channel" },
    ],
    trends: [
      {
        id: "first-signal",
        title: "This room is ready for its first signal",
        detail: "Add the first songs, invite people, or start with a genre channel.",
      },
    ],
    topSongs: [],
    comparison: [
      { label: "Energy", user: 0, room: 0 },
      { label: "Familiarity", user: 0, room: 0 },
      { label: "Discovery", user: 0, room: 0 },
      { label: "Mood", user: 0, room: 0 },
      { label: "Tempo", user: 0, room: 0 },
    ],
    recap: "Insights appear once people start shaping the room.",
    distribution: [
      { label: "House", value: 25, color: "#82bb9c" },
      { label: "Afro House", value: 25, color: "#d9a85e" },
      { label: "Rap", value: 25, color: "#e9878f" },
      { label: "Chill", value: 25, color: "#8bb9d8" },
    ],
    empty: true,
  },
};

const peopleList = Object.values(people);

export const scenarios: Scenario[] = [
  {
    id: "populated",
    label: "Populated",
    description: "Healthy activity across rooms, songs, and social overlap.",
    user: people.joshua,
    people: peopleList,
    home: {
      greeting: "Good evening, Joshua",
      subtitle: "leaning rhythmic this week",
      stateMetrics: [
        { label: "Discovery", value: 71, color: "#d9a85e", detail: "+12 today" },
        { label: "Energy", value: 64, color: "#e9878f", detail: "steady" },
        { label: "Social", value: 58, color: "#8bb9d8", detail: "2 overlaps active" },
      ],
      summary: "You explored more than usual today.",
      shifts: [
        { id: "1", title: "More Afro House", detail: "Your room momentum moved warmer after 9 PM." },
        { id: "2", title: "Friends influenced your listening", detail: "Two overlap picks made it into rotation." },
        { id: "3", title: "Late-night energy increased", detail: "Tempo climbed in your final session." },
        { id: "4", title: "2 rooms active now", detail: "Late Night and Friday Kickback are both moving." },
      ],
      continueListening: [songs.flightFm, songs.relaxMyEyes, songs.location],
      activeRooms: [rooms.lateNight, rooms.fridayKickback],
    },
    rooms: [rooms.lateNight, rooms.fridayKickback],
    player: {
      currentSong: songs.move,
      contextLabel: "Playing in Friday Kickback",
      queue: [songs.relaxMyEyes, songs.freeMind, songs.flightFm],
      related: [songs.location, songs.adoreU, songs.freeMind],
      roomPicks: [songs.flightFm, songs.move, songs.relaxMyEyes],
    },
    profile: {
      descriptor: "Rhythmic / melodic / social listener",
      stats: [
        { label: "Rooms joined", value: "4" },
        { label: "Songs added", value: "38" },
        { label: "Top genres", value: "Afro House, Chill" },
        { label: "Avg match", value: "74%" },
      ],
      trends: [
        { id: "pt1", title: "Your energy rose late week", detail: "Thursday to Saturday tilted more percussive." },
        { id: "pt2", title: "Overlap with Maya strengthened", detail: "Seven shared saves this week." },
      ],
      topChannels: ["Afro House", "Songs", "Insights"],
      recentAdditions: [songs.move, songs.relaxMyEyes, songs.freeMind],
      overlaps: [
        { name: "Maya", value: "82% match", color: "#de8ea2" },
        { name: "Tevin", value: "76% match", color: "#8bb9d8" },
        { name: "Nina", value: "71% match", color: "#8bb89e" },
      ],
    },
  },
  {
    id: "new-user",
    label: "New User",
    description: "Brand new account with guided onboarding prompts.",
    user: people.joshua,
    people: [people.joshua],
    home: {
      greeting: "Good evening, Joshua",
      subtitle: "your music identity is just getting started",
      stateMetrics: [
        { label: "Discovery", value: 34, color: "#d9a85e", detail: "placeholder" },
        { label: "Energy", value: 41, color: "#e9878f", detail: "placeholder" },
        { label: "Social", value: 18, color: "#8bb9d8", detail: "placeholder" },
      ],
      summary: "Your music world starts here.",
      shifts: [],
      continueListening: [],
      activeRooms: [],
      empty: true,
      invites: [
        {
          id: "invite-room",
          title: "Join or create your first room",
          body: "Rooms turn music into a shared space with genres, people, and room-level trends.",
          cta: "Create a room",
        },
        {
          id: "invite-friends",
          title: "Invite friends to shape your sound",
          body: "See where your listening overlaps and how new people change the mix.",
          cta: "Invite friends",
        },
        {
          id: "invite-artists",
          title: "Start with a few artists or songs",
          body: "A few favorites are enough to build your first state and room recommendations.",
          cta: "Add favorite artists",
        },
      ],
    },
    rooms: [],
    player: {
      queue: [],
      related: [],
      roomPicks: [],
    },
    profile: {
      descriptor: "Identity setup in progress",
      stats: [
        { label: "Rooms joined", value: "0" },
        { label: "Songs added", value: "0" },
        { label: "Top genres", value: "Not set" },
        { label: "Avg match", value: "Not yet" },
      ],
      trends: [],
      topChannels: [],
      recentAdditions: [],
      overlaps: [],
      empty: true,
    },
  },
  {
    id: "no-friends",
    label: "No Friends",
    description: "Listening data exists, but the social layer is still missing.",
    user: people.joshua,
    people: [people.joshua],
    home: {
      greeting: "Good evening, Joshua",
      subtitle: "mostly self-directed this week",
      stateMetrics: [
        { label: "Discovery", value: 63, color: "#d9a85e", detail: "solo listening" },
        { label: "Energy", value: 55, color: "#e9878f", detail: "balanced" },
        { label: "Social", value: 12, color: "#8bb9d8", detail: "invite friends" },
      ],
      summary: "Your taste is moving, but it is not social yet.",
      shifts: [
        { id: "nf1", title: "More self-led discovery", detail: "No overlap recommendations yet." },
        { id: "nf2", title: "Late sessions stayed mellow", detail: "Chill songs held on longer this week." },
      ],
      continueListening: [songs.relaxMyEyes, songs.freeMind],
      activeRooms: [rooms.fridayKickback],
    },
    rooms: [rooms.fridayKickback],
    player: {
      currentSong: songs.relaxMyEyes,
      contextLabel: "Autoplay from your current state",
      queue: [songs.freeMind, songs.location],
      related: [songs.flightFm, songs.adoreU],
      roomPicks: [],
    },
    profile: {
      descriptor: "Rhythmic / melodic listener",
      stats: [
        { label: "Rooms joined", value: "1" },
        { label: "Songs added", value: "16" },
        { label: "Top genres", value: "Chill, House" },
        { label: "Avg match", value: "No comparisons yet" },
      ],
      trends: [
        { id: "nfp1", title: "Your listening is becoming steadier", detail: "More repeated evening favorites this week." },
      ],
      topChannels: ["Songs", "Chill"],
      recentAdditions: [songs.relaxMyEyes, songs.freeMind],
      overlaps: [],
    },
  },
  {
    id: "no-rooms",
    label: "No Rooms",
    description: "Personal listening exists, but no rooms have been created or joined.",
    user: people.joshua,
    people: peopleList.slice(0, 3),
    home: {
      greeting: "Good evening, Joshua",
      subtitle: "ready for shared spaces",
      stateMetrics: [
        { label: "Discovery", value: 59, color: "#d9a85e", detail: "personal only" },
        { label: "Energy", value: 49, color: "#e9878f", detail: "steady" },
        { label: "Social", value: 22, color: "#8bb9d8", detail: "no rooms yet" },
      ],
      summary: "Your state is clear. Now it needs a room.",
      shifts: [
        { id: "nr1", title: "Mood softened", detail: "Chill tracks are showing up earlier." },
        { id: "nr2", title: "Discovery held steady", detail: "New artists still landed in rotation." },
      ],
      continueListening: [songs.freeMind, songs.location],
      activeRooms: [],
      empty: true,
      invites: [
        {
          id: "join-room",
          title: "Join or create your first room",
          body: "Build around a genre, a group chat, or an event vibe.",
          cta: "Create a room",
        },
      ],
    },
    rooms: [],
    player: {
      currentSong: songs.location,
      contextLabel: "Autoplay for your current state",
      queue: [songs.freeMind],
      related: [songs.relaxMyEyes],
      roomPicks: [],
    },
    profile: {
      descriptor: "Rhythmic / melodic listener",
      stats: [
        { label: "Rooms joined", value: "0" },
        { label: "Songs added", value: "12" },
        { label: "Top genres", value: "Rap, Chill" },
        { label: "Avg match", value: "Pending rooms" },
      ],
      trends: [
        { id: "nrp1", title: "You have a stable identity base", detail: "Enough listening is in place to start rooms confidently." },
      ],
      topChannels: [],
      recentAdditions: [songs.location, songs.freeMind],
      overlaps: [{ name: "Maya", value: "Invite to compare", color: "#de8ea2" }],
    },
  },
  {
    id: "empty-room",
    label: "Empty Room",
    description: "A room exists, but it has no real activity yet.",
    user: people.joshua,
    people: [people.joshua, people.maya],
    home: {
      greeting: "Good evening, Joshua",
      subtitle: "room created, signal pending",
      stateMetrics: [
        { label: "Discovery", value: 52, color: "#d9a85e", detail: "first room ready" },
        { label: "Energy", value: 47, color: "#e9878f", detail: "calm" },
        { label: "Social", value: 29, color: "#8bb9d8", detail: "one room, little activity" },
      ],
      summary: "You have the space. Now it needs people and songs.",
      shifts: [
        { id: "er1", title: "First room created", detail: "Start with a genre channel or one starter song." },
      ],
      continueListening: [songs.move],
      activeRooms: [rooms.empty],
    },
    rooms: [rooms.empty],
    player: {
      currentSong: songs.move,
      contextLabel: "Recommended to start your first room",
      queue: [],
      related: [songs.relaxMyEyes, songs.freeMind],
      roomPicks: [],
    },
    profile: {
      descriptor: "Rhythmic listener in setup",
      stats: [
        { label: "Rooms joined", value: "1" },
        { label: "Songs added", value: "1" },
        { label: "Top genres", value: "Afro House" },
        { label: "Avg match", value: "Not enough data" },
      ],
      trends: [],
      topChannels: ["Overview"],
      recentAdditions: [songs.move],
      overlaps: [],
    },
  },
  {
    id: "low-data-insights",
    label: "Low Data",
    description: "Room exists with light activity, so insights are sparse and gentle.",
    user: people.joshua,
    people: [people.joshua, people.maya, people.nina],
    home: {
      greeting: "Good evening, Joshua",
      subtitle: "a little signal is starting to form",
      stateMetrics: [
        { label: "Discovery", value: 48, color: "#d9a85e", detail: "light activity" },
        { label: "Energy", value: 44, color: "#e9878f", detail: "quiet week" },
        { label: "Social", value: 36, color: "#8bb9d8", detail: "1 room shaping up" },
      ],
      summary: "There is enough activity to start seeing early patterns.",
      shifts: [
        { id: "ld1", title: "Room influence beginning", detail: "A few shared songs are starting to cluster." },
      ],
      continueListening: [songs.freeMind, songs.relaxMyEyes],
      activeRooms: [rooms.fridayKickback],
    },
    rooms: [rooms.fridayKickback],
    player: {
      currentSong: songs.freeMind,
      contextLabel: "Playing in Friday Kickback",
      queue: [songs.relaxMyEyes],
      related: [songs.location],
      roomPicks: [songs.freeMind],
    },
    profile: {
      descriptor: "Melodic / social listener",
      stats: [
        { label: "Rooms joined", value: "1" },
        { label: "Songs added", value: "6" },
        { label: "Top genres", value: "Chill, House" },
        { label: "Avg match", value: "62%" },
      ],
      trends: [{ id: "ldp1", title: "Identity still forming", detail: "A few more sessions will sharpen your state." }],
      topChannels: ["Overview", "Chill"],
      recentAdditions: [songs.freeMind],
      overlaps: [{ name: "Nina", value: "62% match", color: "#8bb89e" }],
    },
  },
];

export const defaultScenario = scenarios[0];

export function getRoomById(roomId: string | undefined, source: Room[]) {
  return source.find((room) => room.id === roomId) ?? source[0];
}
