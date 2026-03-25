export type TabId = "home" | "rooms" | "player" | "profile";

export type ChannelId =
  | "overview"
  | "house"
  | "afro-house"
  | "rap"
  | "chill"
  | "people"
  | "songs"
  | "insights";

export type Metric = {
  label: string;
  value: number;
  color: string;
  detail?: string;
};

export type Trend = {
  id: string;
  title: string;
  detail: string;
  tone?: string;
};

export type Person = {
  id: string;
  name: string;
  initials: string;
  color: string;
};

export type Song = {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: string;
  context: string;
  artworkColor: string;
  addedBy?: string;
  youtubeId?: string;
};

export type Room = {
  id: string;
  name: string;
  icon: string;
  description: string;
  memberIds: string[];
  memberCountLabel: string;
  liveLabel?: string;
  descriptor: string;
  accent: string;
  overviewStats: string[];
  pulseMetrics: Metric[];
  trends: Trend[];
  topSongs: Song[];
  comparison: Array<{ label: string; user: number; room: number }>;
  recap: string;
  distribution: Array<{ label: string; value: number; color: string }>;
  empty?: boolean;
};

export type HomeInvite = {
  id: string;
  title: string;
  body: string;
  cta: string;
};

export type HomeData = {
  greeting: string;
  subtitle: string;
  stateMetrics: Metric[];
  summary: string;
  shifts: Trend[];
  continueListening: Song[];
  activeRooms: Room[];
  empty?: boolean;
  invites?: HomeInvite[];
};

export type PlayerData = {
  currentSong?: Song;
  contextLabel?: string;
  queue: Song[];
  related: Song[];
  roomPicks: Song[];
};

export type ProfileData = {
  descriptor: string;
  stats: Array<{ label: string; value: string }>;
  trends: Trend[];
  topChannels: string[];
  recentAdditions: Song[];
  overlaps: Array<{ name: string; value: string; color: string }>;
  empty?: boolean;
};

export type Scenario = {
  id: string;
  label: string;
  description: string;
  user: Person;
  people: Person[];
  home: HomeData;
  rooms: Room[];
  player: PlayerData;
  profile: ProfileData;
};

export type UserProfile = {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  createdAt: unknown;
  onboardingComplete: boolean;
  favoriteArtists: string[];
  joinedRoomIds: string[];
};

export type FrequencyRoom = {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: unknown;
  memberIds: string[];
  genreChannels: string[];
  songCount: number;
  activitySummary: string;
  starterVibe?: string | null;
};
