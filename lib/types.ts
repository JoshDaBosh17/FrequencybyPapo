export type TabId = "home" | "rooms" | "compare" | "profile";

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
  friendIds: string[];
  friendCode?: string | null;
  friendCodeNormalized?: string | null;
  createdAt: unknown;
  onboardingComplete: boolean;
  favoriteArtists: string[];
  favoriteArtistEntries?: FavoriteArtistEntry[];
  favoriteArtistsSignature?: string | null;
  joinedRoomIds: string[];
  genreProfile: GenreProfileItem[];
  artistGenreProfiles?: ArtistGenreProfileItem[];
  tasteSummary?: TasteSummary | null;
  homeSuggestion: HomeSuggestion | null;
  enrichmentStatus: "idle" | "loading" | "ready" | "error";
  enrichmentError?: string | null;
  lastEnrichedAt?: unknown;
  activeRecommendationIntent?: GuidedRecommendationIntent | null;
  recommendationCache?: Record<string, HomeSuggestion>;
  recommendationEmptyStateReason?: "artists_updated" | null;
  recommendationStatus: "idle" | "loading" | "ready" | "error";
  recommendationError?: string | null;
  recommendationExpiresAt?: unknown;
  recommendationFailedAt?: unknown;
  openAIFallbackFailedAt?: unknown;
};

export type GenreProfileItem = {
  tag: string;
  weight: number;
};

export type ArtistGenreProfileItem = {
  artist: string;
  tags: string[];
  primaryTag?: string | null;
};

export type FavoriteArtistEntry = {
  artist: string;
  addedAt: string;
};

export type TasteSummary = {
  overview: string | null;
  headline?: string | null;
  subheadline?: string | null;
  generatedAt?: unknown;
};

export type HelixTasteArtist = {
  name: string;
  addedAt: string;
};

export type HelixTasteEntry = {
  genre: string;
  latestAddedAt: string;
  artists: HelixTasteArtist[];
  weight?: number;
};

export type HomeSuggestion = {
  artist: string;
  title: string;
  videoId: string;
  thumbnail: string | null;
  publishedAt: string;
  source: "trusted-channel" | "broad-fallback";
  channelId: string;
  channelTitle: string;
  channelRole?: "official" | "topic" | "unreleased" | "vevo";
  recommendationMode: "song";
  refreshedAt?: unknown;
  selectionMethod?: "deterministic" | "openai-fallback";
  confidenceScore?: number;
  confidenceTier?: "high" | "medium" | "low";
  confidenceReasons?: string[];
  resolutionSource?: "deterministic" | "openai_fallback";
  resolvedAt?: unknown;
  intentKey?: string;
  artistSeed?: string | null;
  genreSeed?: string | null;
  discoveryMode?: "familiar" | "blend" | "explore";
  recommendationPath?: "seed-artist" | "collaborator-remix-path" | "similar-artist-expansion";
};

export type GuidedRecommendationIntent = {
  artistSeed: string | null;
  genreSeed: string | null;
  discoveryMode: "familiar" | "blend" | "explore";
  intentKey: string;
};

export type RoomShareKind = "song" | "artist" | "link";

export type RoomSharePlatformLinks = {
  spotify?: string | null;
  appleMusic?: string | null;
  soundcloud?: string | null;
};

export type RoomShareItem = {
  id: string;
  roomId: string;
  channel: string;
  kind: RoomShareKind;
  title: string;
  subtitle?: string | null;
  url?: string | null;
  note?: string | null;
  links?: RoomSharePlatformLinks | null;
  addedBy: string;
  addedByName?: string | null;
  resolvedArtist?: string | null;
  resolvedTrack?: string | null;
  primaryGenre?: string | null;
  enrichmentStatus?: "idle" | "loading" | "ready" | "error";
  enrichmentError?: string | null;
  enrichmentSource?: "lastfm_track" | "lastfm_artist" | null;
  enrichedAt?: unknown;
  createdAt: unknown;
};

export type FrequencyRoom = {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: unknown;
  visibility: "personal" | "public";
  memberIds: string[];
  genreChannels: string[];
  channelVibes?: Record<string, string>;
  songCount: number;
  activitySummary: string;
  starterVibe?: string | null;
};
