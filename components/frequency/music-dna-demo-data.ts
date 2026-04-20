import { getGenreColor } from "@/lib/frequency/genre-colors";
import type { Person } from "@/lib/types";
import { getAvatarTone, getInitials } from "@/lib/utils";

export type MusicDnaReaction = {
  emoji: string;
  label: string;
};

export type MusicDnaTrack = {
  artist: string;
  title: string;
};

type MusicDnaGenreFamily =
  | "alt-pop"
  | "club"
  | "electronic"
  | "house"
  | "latin"
  | "reflective"
  | "soul";

export type MusicDnaMoment = {
  collaborationScore: number;
  contributorNote: string;
  contributors: Person[];
  genreFamily: MusicDnaGenreFamily;
  iconicScore: number;
  id: string;
  memoryTag: string;
  reactions: MusicDnaReaction[];
  representativeArtists: string[];
  representativeSongs: MusicDnaTrack[];
  statLabel: string;
  statValue: string;
  shiftFrom: string;
  shiftScore: number;
  shiftTo: string;
  story: string;
  timestamp: string;
  title: string;
  topContributor: Person;
  topGenre: string;
  vibeSummary: string;
};

export type MusicDnaInsight = {
  accent: string;
  detail: string;
  label: string;
  value: string;
};

function buildPerson(id: string, name: string) {
  return {
    color: getAvatarTone(name),
    id,
    initials: getInitials(name),
    name,
  } satisfies Person;
}

export const MUSIC_DNA_PEOPLE = {
  chris: buildPerson("chris", "Chris"),
  dani: buildPerson("dani", "Dani"),
  josh: buildPerson("josh", "Josh"),
  luis: buildPerson("luis", "Luis"),
  marcus: buildPerson("marcus", "Marcus"),
  maya: buildPerson("maya", "Maya"),
  nia: buildPerson("nia", "Nia"),
  zoe: buildPerson("zoe", "Zoe"),
} as const;

const GENRE_FAMILY_LABELS: Record<MusicDnaGenreFamily, string> = {
  "alt-pop": "Alt-pop return",
  club: "Club pressure",
  electronic: "Electronic discovery",
  house: "House lineage",
  latin: "Latin warmth",
  reflective: "Reflective moods",
  soul: "Soul memory",
};

export const MUSIC_DNA_MOMENTS = [
  {
    collaborationScore: 72,
    contributorNote:
      "Maya introduced this wave, and Josh and Nia kept feeding quieter after-hours tracks into the mix until it became the default late-night setting.",
    contributors: [MUSIC_DNA_PEOPLE.maya, MUSIC_DNA_PEOPLE.josh, MUSIC_DNA_PEOPLE.nia],
    genreFamily: "electronic",
    iconicScore: 79,
    id: "spring-24",
    memoryTag: "Headphones after midnight.",
    reactions: [
      { emoji: "🖤", label: "late night energy" },
      { emoji: "🌊", label: "whole vibe" },
    ],
    representativeArtists: ["Tourist", "Fred again..", "Bonobo-inspired mix"],
    representativeSongs: [
      { artist: "Tourist-inspired", title: "Sunspill" },
      { artist: "After-hours demo", title: "Afterlight" },
      { artist: "Soft electronic circle", title: "Echo Pool" },
    ],
    statLabel: "Biggest shift",
    statValue: "Bedroom indie -> soft electronic",
    shiftFrom: "bedroom indie drift",
    shiftScore: 82,
    shiftTo: "late-night indie electronic",
    story:
      "This was the first era where the taste DNA felt nocturnal. Guitars faded back, soft synths moved forward, and the playlist started feeling like a place.",
    timestamp: "Mar - May 2024",
    title: "Spring '24",
    topContributor: MUSIC_DNA_PEOPLE.maya,
    topGenre: "indie electronic",
    vibeSummary:
      "Discovering late-night indie and soft electronic, mostly through headphones and low-lit drives.",
  },
  {
    collaborationScore: 88,
    contributorNote:
      "Luis pushed the percussion brighter, and Maya kept the warmer vocal cuts around long enough for the whole group to catch the same summer loop.",
    contributors: [
      MUSIC_DNA_PEOPLE.luis,
      MUSIC_DNA_PEOPLE.josh,
      MUSIC_DNA_PEOPLE.maya,
      MUSIC_DNA_PEOPLE.chris,
    ],
    genreFamily: "house",
    iconicScore: 92,
    id: "summer-24",
    memoryTag: "Windows down at blue hour.",
    reactions: [
      { emoji: "☀️", label: "core summer memory" },
      { emoji: "🔥", label: "on repeat" },
    ],
    representativeArtists: ["Keinemusik-inspired", "AMÉMÉ-inspired", "RÜFÜS-adjacent"],
    representativeSongs: [
      { artist: "Keinemusik-inspired", title: "Coastal Motion" },
      { artist: "AMÉMÉ-inspired", title: "Palm Heat" },
      { artist: "RÜFÜS-adjacent", title: "Blue Hour Drums" },
    ],
    statLabel: "Most played vibe",
    statValue: "Beach drive percussion",
    shiftFrom: "late-night indie electronic",
    shiftScore: 76,
    shiftTo: "afro house",
    story:
      "Summer opened the rhythm up. Everything got warmer, brighter, and built for windows-down replay between the beach and the city.",
    timestamp: "Jun - Aug 2024",
    title: "Summer '24",
    topContributor: MUSIC_DNA_PEOPLE.luis,
    topGenre: "afro house",
    vibeSummary:
      "Windows down, beach drives, and brighter percussion taking over every shared playlist.",
  },
  {
    collaborationScore: 76,
    contributorNote:
      "Chris dominated this era with club edits and basement cuts that everybody kept quoting the week after.",
    contributors: [
      MUSIC_DNA_PEOPLE.chris,
      MUSIC_DNA_PEOPLE.dani,
      MUSIC_DNA_PEOPLE.marcus,
      MUSIC_DNA_PEOPLE.josh,
    ],
    genreFamily: "club",
    iconicScore: 86,
    id: "halloween-24",
    memoryTag: "Costume-night basement loop.",
    reactions: [
      { emoji: "🕺", label: "dance era" },
      { emoji: "😮‍💨", label: "chaos" },
    ],
    representativeArtists: [
      "Underground club edits",
      "Jersey club flips",
      "After-hours remix culture",
    ],
    representativeSongs: [
      { artist: "Underground club edits", title: "Blackout Bounce" },
      { artist: "Jersey club flips", title: "Ghost Lane" },
      { artist: "After-hours remix culture", title: "2AM Teeth" },
    ],
    statLabel: "Core memory",
    statValue: "Costume-night basement loop",
    shiftFrom: "afro house glow",
    shiftScore: 93,
    shiftTo: "darker jersey club edits",
    story:
      "The taste DNA got sharper here. Faster drums, darker rooms, and more dramatic energy in every replay.",
    timestamp: "Oct 2024",
    title: "Halloween '24",
    topContributor: MUSIC_DNA_PEOPLE.chris,
    topGenre: "jersey club",
    vibeSummary:
      "Darker club edits, dramatic energy, and a little bit of chaos in every replay.",
  },
  {
    collaborationScore: 80,
    contributorNote:
      "Dani anchored the soul side while Nia and Maya pulled the mood toward family-memory records and reflective rap.",
    contributors: [
      MUSIC_DNA_PEOPLE.dani,
      MUSIC_DNA_PEOPLE.nia,
      MUSIC_DNA_PEOPLE.josh,
      MUSIC_DNA_PEOPLE.maya,
    ],
    genreFamily: "soul",
    iconicScore: 82,
    id: "thanksgiving-24",
    memoryTag: "Family table, then the drive home.",
    reactions: [
      { emoji: "😮‍💨", label: "healing phase" },
      { emoji: "🖤", label: "late night energy" },
    ],
    representativeArtists: [
      "Alternative R&B blend",
      "Reflective rap circle",
      "Soul-first late-night mix",
    ],
    representativeSongs: [
      { artist: "Alternative R&B blend", title: "Table for Twelve" },
      { artist: "Reflective rap circle", title: "November Lights" },
      { artist: "Soul-first late-night mix", title: "Basement Stereo" },
    ],
    statLabel: "Core memory",
    statValue: "Drive-home soul loop",
    shiftFrom: "jersey club edits",
    shiftScore: 78,
    shiftTo: "reflective rap and soul",
    story:
      "Thanksgiving '24 slowed everything down into family energy, reflective bars, and soul records that felt fuller on the drive home.",
    timestamp: "Nov 2024",
    title: "Thanksgiving '24",
    topContributor: MUSIC_DNA_PEOPLE.dani,
    topGenre: "alternative R&B",
    vibeSummary:
      "Nostalgic, family-centered, and rooted in reflective rap and alternative R&B.",
  },
  {
    collaborationScore: 69,
    contributorNote:
      "Nia reframed the rotation around healing-night ambient cuts while Zoe kept just enough melodic motion in the mix.",
    contributors: [MUSIC_DNA_PEOPLE.nia, MUSIC_DNA_PEOPLE.zoe, MUSIC_DNA_PEOPLE.josh],
    genreFamily: "reflective",
    iconicScore: 83,
    id: "winter-break-24",
    memoryTag: "2 a.m. headphones and apartment lights.",
    reactions: [
      { emoji: "😮‍💨", label: "healing phase" },
      { emoji: "🖤", label: "late night energy" },
    ],
    representativeArtists: [
      "Ambient electronic drift",
      "Four Tet-adjacent hush",
      "Healing-night instrumentals",
    ],
    representativeSongs: [
      { artist: "Ambient electronic drift", title: "Quiet Weather" },
      { artist: "Four Tet-adjacent hush", title: "Window Snow" },
      { artist: "Healing-night instrumentals", title: "Soft Departure" },
    ],
    statLabel: "Most played vibe",
    statValue: "2 a.m. ambient reset",
    shiftFrom: "reflective rap and soul",
    shiftScore: 74,
    shiftTo: "ambient electronic",
    story:
      "Winter Break turned inward. The DNA got quieter, slower, and more about space than hooks.",
    timestamp: "Dec 2024 - Jan 2025",
    title: "Winter Break '24",
    topContributor: MUSIC_DNA_PEOPLE.nia,
    topGenre: "ambient electronic",
    vibeSummary:
      "Introspective, healing, and built for ambient nights with no rush.",
  },
  {
    collaborationScore: 90,
    contributorNote:
      "Zoe framed this as a louder, more social trip era, and the whole group started treating the aux like a competition.",
    contributors: [
      MUSIC_DNA_PEOPLE.zoe,
      MUSIC_DNA_PEOPLE.luis,
      MUSIC_DNA_PEOPLE.chris,
      MUSIC_DNA_PEOPLE.josh,
    ],
    genreFamily: "latin",
    iconicScore: 88,
    id: "spring-break-25",
    memoryTag: "No-skips trip soundtrack energy.",
    reactions: [
      { emoji: "✈️", label: "trip soundtrack" },
      { emoji: "🎉", label: "party starter" },
    ],
    representativeArtists: [
      "Reggaeton crossover set",
      "Latin club edits",
      "Tropical pregame mix",
    ],
    representativeSongs: [
      { artist: "Reggaeton crossover set", title: "Arena Rosa" },
      { artist: "Latin club edits", title: "Marea Flash" },
      { artist: "Tropical pregame mix", title: "No Dormimos" },
      { artist: "Latin club edits", title: "Hotel Pulse" },
    ],
    statLabel: "Most collaborative period",
    statValue: "4 friends pushing the aux",
    shiftFrom: "ambient electronic",
    shiftScore: 97,
    shiftTo: "reggaeton / latin club",
    story:
      "Spring Break '25 blew the doors open. Everything got tropical, louder, and more group-driven the second people started traveling together.",
    timestamp: "Mar 2025",
    title: "Spring Break '25",
    topContributor: MUSIC_DNA_PEOPLE.zoe,
    topGenre: "reggaeton / latin club",
    vibeSummary:
      "Tropical, social, louder, and clearly driven by the group instead of one lane.",
  },
  {
    collaborationScore: 96,
    contributorNote:
      "Josh built the core sequence here, and the rest of the group kept feeding it rooftop records and drive music until it felt untouchable.",
    contributors: [
      MUSIC_DNA_PEOPLE.josh,
      MUSIC_DNA_PEOPLE.maya,
      MUSIC_DNA_PEOPLE.luis,
      MUSIC_DNA_PEOPLE.dani,
    ],
    genreFamily: "house",
    iconicScore: 96,
    id: "summer-25",
    memoryTag: "Rooftops, drives, and no skipped transitions.",
    reactions: [
      { emoji: "🔥", label: "on repeat" },
      { emoji: "🎉", label: "party starter" },
    ],
    representativeArtists: [
      "Latin electronic house blend",
      "Rooftop edit circles",
      "Drive-time house pulse",
    ],
    representativeSongs: [
      { artist: "Latin electronic house blend", title: "Rooftop Receiver" },
      { artist: "Drive-time house pulse", title: "City Heatline" },
      { artist: "Rooftop edit circles", title: "Sunset on 95" },
      { artist: "Drive-time house pulse", title: "Velvet Traffic" },
    ],
    statLabel: "Most iconic era",
    statValue: "Rooftop + drive soundtrack",
    shiftFrom: "reggaeton / latin club",
    shiftScore: 81,
    shiftTo: "latin electronic house",
    story:
      "This was peak social frequency. Rooftops, drives, and pregame transitions all started sounding like one polished shared universe.",
    timestamp: "Jun - Aug 2025",
    title: "Summer of '25",
    topContributor: MUSIC_DNA_PEOPLE.josh,
    topGenre: "latin electronic house",
    vibeSummary:
      "Peak social energy with rooftop records, drive music, and a little extra glow in everything.",
  },
  {
    collaborationScore: 72,
    contributorNote:
      "Maya tightened the curation here, while Nia and Zoe helped keep the darker edges clean instead of messy.",
    contributors: [
      MUSIC_DNA_PEOPLE.maya,
      MUSIC_DNA_PEOPLE.nia,
      MUSIC_DNA_PEOPLE.josh,
      MUSIC_DNA_PEOPLE.zoe,
    ],
    genreFamily: "alt-pop",
    iconicScore: 77,
    id: "back-to-school-25",
    memoryTag: "Sharper playlists after a huge summer.",
    reactions: [
      { emoji: "🖤", label: "late night energy" },
      { emoji: "🔥", label: "on repeat" },
    ],
    representativeArtists: [
      "Alt-pop selectors",
      "House-tinged songwriting",
      "Moody curation cuts",
    ],
    representativeSongs: [
      { artist: "Alt-pop selectors", title: "First Week Silence" },
      { artist: "Moody curation cuts", title: "Silver Hallway" },
      { artist: "House-tinged songwriting", title: "Syllabus Hearts" },
    ],
    statLabel: "Biggest shift",
    statValue: "Open summer -> tighter curation",
    shiftFrom: "latin electronic house",
    shiftScore: 86,
    shiftTo: "alt pop / house blend",
    story:
      "The playlists got tighter here. Less sprawl, more intention, and moodier songs that still kept a clean house undercurrent.",
    timestamp: "Sep 2025",
    title: "Back to School '25",
    topContributor: MUSIC_DNA_PEOPLE.maya,
    topGenre: "alt pop / house blend",
    vibeSummary:
      "Tighter curation, moodier edges, and sharper taste decisions after a huge summer.",
  },
  {
    collaborationScore: 84,
    contributorNote:
      "Dani anchored the soulful side while Maya kept the reflective house pulse from disappearing.",
    contributors: [
      MUSIC_DNA_PEOPLE.dani,
      MUSIC_DNA_PEOPLE.maya,
      MUSIC_DNA_PEOPLE.nia,
      MUSIC_DNA_PEOPLE.josh,
    ],
    genreFamily: "latin",
    iconicScore: 85,
    id: "thanksgiving-25",
    memoryTag: "Warm, steady, and fully intentional.",
    reactions: [
      { emoji: "🌊", label: "whole vibe" },
      { emoji: "😮‍💨", label: "healing phase" },
    ],
    representativeArtists: [
      "Latin soul house",
      "Reflective vocal house",
      "Warm holiday blends",
    ],
    representativeSongs: [
      { artist: "Latin soul house", title: "Candle in the Kitchen" },
      { artist: "Reflective vocal house", title: "November Sonido" },
      { artist: "Warm holiday blends", title: "Slow Plates" },
    ],
    statLabel: "Most replayed track",
    statValue: "November Sonido",
    shiftFrom: "alt pop / house blend",
    shiftScore: 69,
    shiftTo: "latin soul house",
    story:
      "Thanksgiving '25 became a nostalgic mix of latin soul and reflective house, softer than summer but just as emotionally rich.",
    timestamp: "Nov 2025",
    title: "Thanksgiving '25",
    topContributor: MUSIC_DNA_PEOPLE.dani,
    topGenre: "latin soul house",
    vibeSummary:
      "Nostalgic, warm, and suspended between latin soul and reflective house.",
  },
  {
    collaborationScore: 80,
    contributorNote:
      "Marcus gave the era its cinematic confidence, and Chris helped keep the club edge sharp instead of too polished.",
    contributors: [
      MUSIC_DNA_PEOPLE.marcus,
      MUSIC_DNA_PEOPLE.chris,
      MUSIC_DNA_PEOPLE.josh,
      MUSIC_DNA_PEOPLE.luis,
    ],
    genreFamily: "house",
    iconicScore: 86,
    id: "new-year-26",
    memoryTag: "Cinematic reset energy.",
    reactions: [
      { emoji: "🎉", label: "party starter" },
      { emoji: "🔥", label: "on repeat" },
    ],
    representativeArtists: [
      "Melodic house cinema",
      "After-hours progressive cuts",
      "Big-room reset energy",
    ],
    representativeSongs: [
      { artist: "Melodic house cinema", title: "Reset Sequence" },
      { artist: "After-hours progressive cuts", title: "Glass Countdown" },
      { artist: "Big-room reset energy", title: "Midnight Horizon" },
    ],
    statLabel: "Biggest shift",
    statValue: "Nostalgia -> cinematic reset",
    shiftFrom: "latin soul house",
    shiftScore: 89,
    shiftTo: "melodic house",
    story:
      "New Year '26 felt like the camera pulled back. The sound got bolder, more cinematic, and more certain of its club identity.",
    timestamp: "Jan 2026",
    title: "New Year '26",
    topContributor: MUSIC_DNA_PEOPLE.marcus,
    topGenre: "melodic house",
    vibeSummary:
      "A cinematic reset with a bolder, cleaner club identity.",
  },
  {
    collaborationScore: 95,
    contributorNote:
      "Luis pushed this into a full trip identity, and Josh, Dani, and Maya helped it hold onto both warmth and nightlife.",
    contributors: [
      MUSIC_DNA_PEOPLE.luis,
      MUSIC_DNA_PEOPLE.josh,
      MUSIC_DNA_PEOPLE.dani,
      MUSIC_DNA_PEOPLE.maya,
    ],
    genreFamily: "latin",
    iconicScore: 99,
    id: "puerto-rico-26",
    memoryTag: "Ocean air at 2 a.m.",
    reactions: [
      { emoji: "✈️", label: "trip soundtrack" },
      { emoji: "🌊", label: "whole vibe" },
      { emoji: "☀️", label: "core memory" },
    ],
    representativeArtists: [
      "Afro-latin house circles",
      "Ocean-air percussion edits",
      "Nightlife trip selections",
    ],
    representativeSongs: [
      { artist: "Afro-latin house circles", title: "Marina Pulse" },
      { artist: "Ocean-air percussion edits", title: "Condado Blue" },
      { artist: "Nightlife trip selections", title: "Ocean Taxi" },
      { artist: "Afro-latin house circles", title: "Warm Concrete" },
    ],
    statLabel: "Core memory",
    statValue: "Ocean air at 2 a.m.",
    shiftFrom: "melodic house",
    shiftScore: 91,
    shiftTo: "afro-latin house",
    story:
      "Puerto Rico '26 pushed the sound into warmer percussion, ocean air, nightlife, and a trip soundtrack that felt attached to place.",
    timestamp: "Mar 2026",
    title: "Puerto Rico '26",
    topContributor: MUSIC_DNA_PEOPLE.luis,
    topGenre: "afro-latin house",
    vibeSummary:
      "Warm percussion, ocean air, nightlife, and the clearest trip soundtrack moment in the whole arc.",
  },
] satisfies MusicDnaMoment[];

function getMode<T extends string>(values: T[]) {
  const counts = new Map<T, number>();

  values.forEach((value) => {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });

  return Array.from(counts.entries()).sort((left, right) => right[1] - left[1])[0] ?? null;
}

const consistentGenreEntry = getMode(MUSIC_DNA_MOMENTS.map((moment) => moment.genreFamily));
const consistentGenreFamily = consistentGenreEntry?.[0] ?? "house";
const consistentGenreCount = consistentGenreEntry?.[1] ?? 0;
const biggestJumpMoment =
  [...MUSIC_DNA_MOMENTS].sort((left, right) => right.shiftScore - left.shiftScore)[0] ??
  MUSIC_DNA_MOMENTS[0];
const iconicMoment =
  [...MUSIC_DNA_MOMENTS].sort((left, right) => right.iconicScore - left.iconicScore)[0] ??
  MUSIC_DNA_MOMENTS[0];
const collaborativeMoment =
  [...MUSIC_DNA_MOMENTS].sort(
    (left, right) => right.collaborationScore - left.collaborationScore,
  )[0] ?? MUSIC_DNA_MOMENTS[0];
const uniqueContributorIds = new Set(
  MUSIC_DNA_MOMENTS.flatMap((moment) => moment.contributors.map((person) => person.id)),
);
const contributorScores = new Map<string, number>();
const contributorAppearances = new Map<string, number>();
const contributorLeadCounts = new Map<string, number>();

MUSIC_DNA_MOMENTS.forEach((moment) => {
  moment.contributors.forEach((person) => {
    if (person.id === MUSIC_DNA_PEOPLE.josh.id) {
      return;
    }

    contributorScores.set(person.id, (contributorScores.get(person.id) ?? 0) + 1);
    contributorAppearances.set(
      person.id,
      (contributorAppearances.get(person.id) ?? 0) + 1,
    );
  });

  if (moment.topContributor.id !== MUSIC_DNA_PEOPLE.josh.id) {
    contributorScores.set(
      moment.topContributor.id,
      (contributorScores.get(moment.topContributor.id) ?? 0) + 3,
    );
    contributorLeadCounts.set(
      moment.topContributor.id,
      (contributorLeadCounts.get(moment.topContributor.id) ?? 0) + 1,
    );
  }
});

const mostInfluentialFriendId =
  Array.from(contributorScores.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] ??
  MUSIC_DNA_PEOPLE.maya.id;
const mostInfluentialFriend =
  Object.values(MUSIC_DNA_PEOPLE).find((person) => person.id === mostInfluentialFriendId) ??
  MUSIC_DNA_PEOPLE.maya;
const mostInfluentialAppearances =
  contributorAppearances.get(mostInfluentialFriend.id) ?? 0;
const mostInfluentialLeadCount = contributorLeadCounts.get(mostInfluentialFriend.id) ?? 0;

export const MUSIC_DNA_INSIGHTS = [
  {
    accent: getGenreColor(MUSIC_DNA_MOMENTS[0].topGenre),
    detail: `${consistentGenreCount} eras kept a ${GENRE_FAMILY_LABELS[consistentGenreFamily].toLowerCase()} pulse.`,
    label: "Most consistent genre",
    value: GENRE_FAMILY_LABELS[consistentGenreFamily],
  },
  {
    accent: mostInfluentialFriend.color,
    detail: `${mostInfluentialFriend.name} appeared in ${mostInfluentialAppearances} eras and led ${mostInfluentialLeadCount}.`,
    label: "Most influential friend",
    value: mostInfluentialFriend.name,
  },
  {
    accent: getGenreColor(biggestJumpMoment.topGenre),
    detail: `${biggestJumpMoment.shiftFrom} -> ${biggestJumpMoment.shiftTo}`,
    label: "Biggest genre jump",
    value: biggestJumpMoment.title,
  },
  {
    accent: getGenreColor(iconicMoment.topGenre),
    detail: iconicMoment.memoryTag,
    label: "Most iconic era",
    value: iconicMoment.title,
  },
  {
    accent: getGenreColor(collaborativeMoment.topGenre),
    detail: `${collaborativeMoment.contributors.length} contributors moved this moment together.`,
    label: "Most collaborative period",
    value: collaborativeMoment.title,
  },
  {
    accent: MUSIC_DNA_PEOPLE.josh.color,
    detail: `Josh plus ${Math.max(0, uniqueContributorIds.size - 1)} friends shape the full DNA.`,
    label: "Total contributors",
    value: `${uniqueContributorIds.size} voices`,
  },
] satisfies MusicDnaInsight[];
