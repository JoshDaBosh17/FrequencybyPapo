import type {
  RoomSharePlatformLinks,
  RoomShareSourcePlatform,
} from "@/lib/types"

import { normalizeComparableText } from "./artists"
import { resolveCanonicalSongEntry } from "./song-correction"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_SONG_LINK_MODEL =
  process.env.OPENAI_SONG_LINK_MODEL ??
  process.env.OPENAI_FALLBACK_MODEL ??
  "gpt-4o-mini"
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET

const PLATFORM_SCORE_THRESHOLD = {
  appleMusic: 0.64,
  soundcloud: 0.54,
  spotify: 0.66,
} as const

const SEARCH_LIMIT = 6
const TITLE_NOISE_PATTERN =
  /\b(official|audio|video|lyrics?|visualizer|topic|remaster(?:ed)?|live|hq|hd|4k)\b/gi
const TITLE_NOISE_TEST_PATTERN =
  /\b(official|audio|video|lyrics?|visualizer|topic|remaster(?:ed)?|live|hq|hd|4k)\b/i
const ALT_VERSION_PATTERN =
  /\b(remix|edit|flip|bootleg|rework|mashup|sped up|slowed|nightcore|radio edit|mix)\b/i
const SOUNDCLOUD_RESULT_PATTERN = /<li><h2><a href="(\/[^"]+)">(.*?)<\/a><\/h2><\/li>/g
const SOUNDCLOUD_RESERVED_PATHS = new Set([
  "discover",
  "popular",
  "search",
  "sets",
  "stations",
  "stream",
  "upload",
  "you",
])

type OpenAIResponse = {
  output_text?: string
  output?: Array<{
    type?: string
    content?: Array<{
      type?: string
      text?: string
    }>
  }>
}

type PlatformCandidate = {
  artist: string
  popularity?: number
  title: string
  url: string
}

type SongSearchMetadata = {
  artist: string
  metadataSource: "input" | "openai_support" | "song_correction"
  searchQuery: string
  title: string
}

type ExtractedMusicLinkMetadata = {
  sourcePlatform: RoomShareSourcePlatform | null
  artist: string | null
  title: string | null
}

let spotifyTokenCache:
  | {
      accessToken: string
      expiresAt: number
    }
  | null = null

function logSongPlatformEvent(event: string, payload: Record<string, unknown>) {
  console.log("[frequency][song-platform-links]", {
    event,
    ...payload,
  })
}

function emptyPlatformLinks(): RoomSharePlatformLinks {
  return {
    appleMusic: null,
    soundcloud: null,
    spotify: null,
    youtube: null,
  }
}

function normalizeDisplayText(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, " ") || null
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function stripArtistPrefixFromTitle(title: string, artist: string | null) {
  if (!artist) {
    return title
  }

  return title.replace(new RegExp(`^${escapeRegExp(artist)}\\s*(?:-|–|—|:|\\|)\\s*`, "i"), "").trim()
}

function sanitizeResolvedTitle(value: string | null | undefined) {
  const normalized = normalizeDisplayText(value)

  if (!normalized) {
    return null
  }

  return normalized
    .replace(/\((official(?:\s+(?:audio|video))?|audio|video|lyrics?|visualizer|topic|hd|4k|remaster(?:ed)?|live)\)/gi, " ")
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/\s+/g, " ")
    .trim() || null
}

function normalizeSongTitle(value: string) {
  return normalizeComparableText(value)
    .replace(TITLE_NOISE_PATTERN, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizeArtist(value: string) {
  return normalizeComparableText(value)
    .replace(/\b(official|music|records|recordings|topic|channel)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function hasMetadataNoise(value: string) {
  return TITLE_NOISE_TEST_PATTERN.test(value) || /[|/]| feat\.?| ft\.?| featuring /i.test(value)
}

function buildSearchQuery(title: string, artist: string) {
  return [title.trim(), artist.trim()].filter(Boolean).join(" ")
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
  }

function parseArtistTrackFromLabel(label: string) {
  const parts = label
    .split(/\s(?:-|–|—|\|)\s/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length < 2) {
    return null
  }

  return {
    artist: parts[0] ?? null,
    track: parts.slice(1).join(" - ") || null,
  }
}

function cleanSoundCloudHandle(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b(official|music|records|recordings|audio|soundcloud|topic)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function parseUrl(url: string | null | undefined) {
  if (!url) {
    return null
  }

  try {
    return new URL(url)
  } catch {
    return null
  }
}

function isYouTubeHost(hostname: string) {
  return (
    hostname === "youtu.be" ||
    hostname === "youtube.com" ||
    hostname === "www.youtube.com" ||
    hostname === "m.youtube.com" ||
    hostname.endsWith(".youtube.com")
  )
}

export function detectMusicSourcePlatform(url: string | null | undefined): RoomShareSourcePlatform | null {
  const parsedUrl = parseUrl(url)

  if (!parsedUrl) {
    return null
  }

  const hostname = parsedUrl.hostname.toLowerCase()

  if (hostname === "open.spotify.com" || hostname.endsWith(".spotify.com")) {
    return "spotify"
  }

  if (
    hostname === "music.apple.com" ||
    hostname === "itunes.apple.com" ||
    hostname.endsWith(".apple.com")
  ) {
    return "appleMusic"
  }

  if (hostname === "soundcloud.com" || hostname.endsWith(".soundcloud.com")) {
    return "soundcloud"
  }

  if (isYouTubeHost(hostname)) {
    return "youtube"
  }

  return null
}

function levenshteinDistance(left: string, right: string) {
  const rows = left.length + 1
  const cols = right.length + 1
  const dp = Array.from({ length: rows }, () => Array(cols).fill(0))

  for (let row = 0; row < rows; row += 1) {
    dp[row][0] = row
  }

  for (let col = 0; col < cols; col += 1) {
    dp[0][col] = col
  }

  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = left[row - 1] === right[col - 1] ? 0 : 1
      dp[row][col] = Math.min(
        dp[row - 1][col] + 1,
        dp[row][col - 1] + 1,
        dp[row - 1][col - 1] + cost,
      )
    }
  }

  return dp[left.length][right.length]
}

function similarity(left: string, right: string) {
  if (!left || !right) {
    return 0
  }

  const distance = levenshteinDistance(left, right)
  return 1 - distance / Math.max(left.length, right.length)
}

function candidateScore(params: {
  candidateArtist: string
  candidateTitle: string
  popularity?: number
  targetArtist: string
  targetTitle: string
}) {
  const normalizedTargetTitle = normalizeSongTitle(params.targetTitle)
  const normalizedTargetArtist = normalizeArtist(params.targetArtist)
  const normalizedCandidateTitle = normalizeSongTitle(params.candidateTitle)
  const normalizedCandidateArtist = normalizeArtist(params.candidateArtist)
  const titleSimilarity = similarity(normalizedTargetTitle, normalizedCandidateTitle)
  const artistSimilarity = similarity(normalizedTargetArtist, normalizedCandidateArtist)
  const popularityScore =
    typeof params.popularity === "number" ? Math.max(0, Math.min(1, params.popularity / 100)) : 0
  const alternateVersionPenalty =
    !ALT_VERSION_PATTERN.test(params.targetTitle) && ALT_VERSION_PATTERN.test(params.candidateTitle)
      ? 0.14
      : 0

  return (
    titleSimilarity * 0.64 +
    artistSimilarity * 0.28 +
    popularityScore * 0.08 -
    alternateVersionPenalty
  )
}

function getOpenAIOutputText(payload: OpenAIResponse) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text
  }

  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && typeof content.text === "string" && content.text.trim()) {
        return content.text
      }
    }
  }

  return undefined
}

function shouldUseOpenAISupport(params: {
  artist: string
  exactMatch: boolean
  originalArtist: string
  originalTitle: string
  title: string
}) {
  if (!OPENAI_API_KEY) {
    return false
  }

  return (
    !params.exactMatch ||
    hasMetadataNoise(params.originalTitle) ||
    hasMetadataNoise(params.originalArtist) ||
    params.title !== params.originalTitle ||
    params.artist !== params.originalArtist
  )
}

async function refineSongMetadataWithOpenAI(params: {
  artist: string
  originalArtist: string
  originalTitle: string
  title: string
  url?: string | null
}) {
  if (!OPENAI_API_KEY) {
    return null
  }

  logSongPlatformEvent("openai_song_metadata_started", {
    artist: params.artist,
    model: OPENAI_SONG_LINK_MODEL,
    title: params.title,
  })

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_SONG_LINK_MODEL,
        store: false,
        temperature: 0.2,
        max_output_tokens: 90,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: [
                  "You normalize song metadata for music-platform search in a premium app called Frequency.",
                  "Use the provided song title, artist, and optional canonical hint to return the cleanest safe search metadata.",
                  "Never invent a different song or artist.",
                  "Remove noise like official audio, lyrics, remaster, live, visualizer, or upload labels.",
                  "Keep collaborator names only when clearly part of the artist credit.",
                  "Search query should be compact and based on the cleaned title and artist.",
                ].join("\n"),
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: JSON.stringify({
                  canonicalArtist: params.artist,
                  canonicalTitle: params.title,
                  originalArtist: params.originalArtist,
                  originalTitle: params.originalTitle,
                  url: params.url ?? null,
                }),
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "song_search_metadata",
            strict: true,
            schema: {
              type: "object",
              properties: {
                normalizedArtist: { type: "string" },
                normalizedTitle: { type: "string" },
                searchQuery: { type: "string" },
              },
              required: ["normalizedArtist", "normalizedTitle", "searchQuery"],
              additionalProperties: false,
            },
          },
        },
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      logSongPlatformEvent("openai_song_metadata_failed", {
        artist: params.artist,
        bodyPreview: body.slice(0, 320),
        status: response.status,
        title: params.title,
      })
      return null
    }

    const payload = (await response.json()) as OpenAIResponse
    const outputText = getOpenAIOutputText(payload)
    const parsed = JSON.parse(outputText ?? "{}") as {
      normalizedArtist?: string
      normalizedTitle?: string
      searchQuery?: string
    }

    const normalizedTitle = parsed.normalizedTitle?.trim().replace(/\s+/g, " ") ?? ""
    const normalizedArtist = parsed.normalizedArtist?.trim().replace(/\s+/g, " ") ?? ""
    const searchQuery = parsed.searchQuery?.trim().replace(/\s+/g, " ") ?? ""

    if (!normalizedTitle || !normalizedArtist || !searchQuery) {
      logSongPlatformEvent("openai_song_metadata_failed", {
        artist: params.artist,
        reason: "invalid_output",
        title: params.title,
      })
      return null
    }

    const titleSimilarity = similarity(normalizeSongTitle(params.title), normalizeSongTitle(normalizedTitle))
    const artistSimilarity = similarity(normalizeArtist(params.artist), normalizeArtist(normalizedArtist))

    if (titleSimilarity < 0.52 || artistSimilarity < 0.42) {
      logSongPlatformEvent("openai_song_metadata_failed", {
        artist: params.artist,
        artistSimilarity,
        reason: "low_similarity",
        title: params.title,
        titleSimilarity,
      })
      return null
    }

    logSongPlatformEvent("openai_song_metadata_completed", {
      artist: normalizedArtist,
      searchQuery,
      title: normalizedTitle,
    })

    return {
      artist: normalizedArtist,
      searchQuery,
      title: normalizedTitle,
    }
  } catch (error) {
    logSongPlatformEvent("openai_song_metadata_failed", {
      artist: params.artist,
      error: error instanceof Error ? error.message : "OpenAI metadata support failed.",
      title: params.title,
    })
    return null
  }
}

async function resolveSongSearchMetadata(params: {
  artist: string
  title: string
  url?: string | null
}): Promise<SongSearchMetadata> {
  const originalTitle = params.title.trim().replace(/\s+/g, " ")
  const originalArtist = params.artist.trim().replace(/\s+/g, " ")

  let baseTitle = originalTitle
  let baseArtist = originalArtist
  let exactMatch = false
  let metadataSource: SongSearchMetadata["metadataSource"] = "input"

  try {
    const resolution = await resolveCanonicalSongEntry(originalTitle, originalArtist)

    logSongPlatformEvent("song_correction_completed", {
      canonicalArtist: resolution.canonicalArtist,
      canonicalTitle: resolution.canonicalTitle,
      confidence: resolution.confidence,
      exactMatch: resolution.exactMatch,
      inputArtist: originalArtist,
      inputTitle: originalTitle,
      matched: resolution.matched,
      shouldConfirm: resolution.shouldConfirm,
    })

    if (resolution.matched) {
      baseTitle = resolution.canonicalTitle
      baseArtist = resolution.canonicalArtist
      exactMatch = resolution.exactMatch
      metadataSource = "song_correction"
    }
  } catch (error) {
    logSongPlatformEvent("song_correction_failed", {
      artist: originalArtist,
      error: error instanceof Error ? error.message : "Song correction failed.",
      title: originalTitle,
    })
  }

  if (
    shouldUseOpenAISupport({
      artist: baseArtist,
      exactMatch,
      originalArtist,
      originalTitle,
      title: baseTitle,
    })
  ) {
    const refined = await refineSongMetadataWithOpenAI({
      artist: baseArtist,
      originalArtist,
      originalTitle,
      title: baseTitle,
      url: params.url,
    })

    if (refined) {
      return {
        artist: refined.artist,
        metadataSource: "openai_support",
        searchQuery: refined.searchQuery,
        title: refined.title,
      }
    }
  }

  return {
    artist: baseArtist,
    metadataSource,
    searchQuery: buildSearchQuery(baseTitle, baseArtist),
    title: baseTitle,
  }
}

export function extractDirectPlatformLinks(
  url: string | null | undefined,
): RoomSharePlatformLinks {
  const sourcePlatform = detectMusicSourcePlatform(url)

  if (!url || !sourcePlatform) {
    return emptyPlatformLinks()
  }

  return {
    ...emptyPlatformLinks(),
    [sourcePlatform]: url,
  }
}

function extractSpotifyTrackId(url: string) {
  const parsedUrl = parseUrl(url)

  if (!parsedUrl) {
    return null
  }

  const segments = parsedUrl.pathname.split("/").filter(Boolean)
  const trackIndex = segments.findIndex((segment) => segment === "track")
  const trackId = trackIndex >= 0 ? segments[trackIndex + 1] : null

  return trackId?.trim() || null
}

function extractAppleMusicTrackId(url: string) {
  const parsedUrl = parseUrl(url)

  if (!parsedUrl) {
    return null
  }

  const queryTrackId = parsedUrl.searchParams.get("i")?.trim()

  if (queryTrackId && /^\d+$/.test(queryTrackId)) {
    return queryTrackId
  }

  const idMatch = parsedUrl.pathname.match(/(?:^|\/)id(\d+)(?:[/?]|$)/i)
  if (idMatch?.[1]) {
    return idMatch[1]
  }

  const segments = parsedUrl.pathname.split("/").filter(Boolean)
  const numericSegment = [...segments].reverse().find((segment) => /^\d+$/.test(segment))

  return numericSegment?.trim() || null
}

async function fetchSpotifyTrackMetadata(url: string) {
  const trackId = extractSpotifyTrackId(url)

  if (!trackId) {
    return null
  }

  const token = await getSpotifyAccessToken()

  if (!token) {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 Frequency/1.0",
      },
    })

    if (!response.ok) {
      throw new Error(`Spotify track page request failed with ${response.status}`)
    }

    const html = await response.text()
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i)
    const pageTitle = normalizeDisplayText(
      decodeHtmlEntities(titleMatch?.[1] ?? "")
        .replace(/\s+\|\s+Spotify\s*$/i, "")
        .trim(),
    )
    const parsedTitle = pageTitle?.match(/^(.*?)\s+-\s+song(?: and lyrics)? by\s+(.*?)$/i)

    return {
      artist: normalizeDisplayText(parsedTitle?.[2]),
      title: sanitizeResolvedTitle(parsedTitle?.[1] ?? pageTitle),
      url,
    }
  }

  const response = await fetch(`https://api.spotify.com/v1/tracks/${encodeURIComponent(trackId)}?market=US`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Spotify track metadata request failed with ${response.status}`)
  }

  const payload = (await response.json()) as {
    artists?: Array<{ name?: string }>
    external_urls?: { spotify?: string }
    name?: string
  }

  const artist = (payload.artists ?? [])
    .map((candidate) => candidate.name?.trim())
    .filter(Boolean)
    .join(", ")

  return {
    artist: normalizeDisplayText(artist),
    title: sanitizeResolvedTitle(payload.name),
    url: normalizeDisplayText(payload.external_urls?.spotify) ?? url,
  }
}

async function fetchAppleMusicTrackMetadata(url: string) {
  const trackId = extractAppleMusicTrackId(url)

  if (!trackId) {
    return null
  }

  const response = await fetch(
    `https://itunes.apple.com/lookup?id=${encodeURIComponent(trackId)}&entity=song&country=US`,
    {
      cache: "no-store",
    },
  )

  if (!response.ok) {
    throw new Error(`Apple Music track metadata request failed with ${response.status}`)
  }

  const payload = (await response.json()) as {
    results?: Array<{
      artistName?: string
      trackName?: string
      trackViewUrl?: string
    }>
  }

  const trackResult = (payload.results ?? []).find(
    (candidate) => candidate.trackName?.trim() && candidate.artistName?.trim(),
  )

  if (!trackResult) {
    return null
  }

  return {
    artist: normalizeDisplayText(trackResult.artistName),
    title: sanitizeResolvedTitle(trackResult.trackName),
    url: normalizeDisplayText(trackResult.trackViewUrl) ?? url,
  }
}

async function fetchSoundCloudTrackMetadata(url: string) {
  const response = await fetch(
    `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`,
    {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 Frequency/1.0",
      },
    },
  )

  if (!response.ok) {
    throw new Error(`SoundCloud oEmbed failed with ${response.status}`)
  }

  const payload = (await response.json()) as {
    author_name?: string
    title?: string
  }

  const parsedTitle = parseArtistTrackFromLabel(payload.title ?? "")
  const artist =
    normalizeDisplayText(parsedTitle?.artist) ??
    normalizeDisplayText(payload.author_name)
  const title = sanitizeResolvedTitle(
    parsedTitle?.track ?? stripArtistPrefixFromTitle(payload.title ?? "", artist),
  )

  return {
    artist,
    title,
    url,
  }
}

async function fetchYouTubeTrackMetadata(url: string) {
  const response = await fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
    { cache: "no-store" },
  )

  if (!response.ok) {
    throw new Error(`YouTube oEmbed failed with ${response.status}`)
  }

  const payload = (await response.json()) as {
    author_name?: string
    title?: string
  }

  const parsedTitle = parseArtistTrackFromLabel(payload.title ?? "")
  const authorName = normalizeDisplayText(payload.author_name)
  const cleanedAuthorName =
    authorName?.replace(/\s+-\s+topic$/i, "").replace(/\s+/g, " ").trim() || null
  const artist = normalizeDisplayText(parsedTitle?.artist) ?? cleanedAuthorName
  const title = sanitizeResolvedTitle(
    parsedTitle?.track ?? stripArtistPrefixFromTitle(payload.title ?? "", artist),
  )

  return {
    artist,
    title,
    url,
  }
}

export async function extractMusicLinkMetadata(
  url: string,
): Promise<ExtractedMusicLinkMetadata> {
  const sourcePlatform = detectMusicSourcePlatform(url)

  if (!sourcePlatform) {
    logSongPlatformEvent("music_link_metadata_skipped", {
      reason: "unsupported_platform",
      url,
    })
    return {
      artist: null,
      sourcePlatform: null,
      title: null,
    }
  }

  logSongPlatformEvent("music_link_metadata_started", {
    sourcePlatform,
    url,
  })

  try {
    const metadata =
      sourcePlatform === "spotify"
        ? await fetchSpotifyTrackMetadata(url)
        : sourcePlatform === "appleMusic"
          ? await fetchAppleMusicTrackMetadata(url)
          : sourcePlatform === "soundcloud"
            ? await fetchSoundCloudTrackMetadata(url)
            : await fetchYouTubeTrackMetadata(url)

    const artist = normalizeDisplayText(metadata?.artist)
    const title = sanitizeResolvedTitle(metadata?.title)

    logSongPlatformEvent("music_link_metadata_completed", {
      sourcePlatform,
      artist,
      title,
      url,
    })

    return {
      artist,
      sourcePlatform,
      title,
    }
  } catch (error) {
    logSongPlatformEvent("music_link_metadata_failed", {
      sourcePlatform,
      url,
      error: error instanceof Error ? error.message : "Music link metadata lookup failed.",
    })

    return {
      artist: null,
      sourcePlatform,
      title: null,
    }
  }
}

async function getSpotifyAccessToken() {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    return null
  }

  if (spotifyTokenCache && spotifyTokenCache.expiresAt > Date.now() + 30_000) {
    return spotifyTokenCache.accessToken
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
    }),
    cache: "no-store",
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Spotify token request failed with ${response.status}: ${body.slice(0, 240)}`)
  }

  const payload = (await response.json()) as {
    access_token?: string
    expires_in?: number
  }

  if (!payload.access_token) {
    throw new Error("Spotify token response did not include an access token.")
  }

  spotifyTokenCache = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + ((payload.expires_in ?? 3600) - 60) * 1000,
  }

  return payload.access_token
}

function dedupeCandidates(candidates: PlatformCandidate[]) {
  const seen = new Set<string>()

  return candidates.filter((candidate) => {
    const key = candidate.url.trim().toLowerCase()
    if (!key || seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}

function pickBestCandidate(params: {
  candidates: PlatformCandidate[]
  minScore: number
  targetArtist: string
  targetTitle: string
}) {
  return dedupeCandidates(params.candidates)
    .map((candidate) => ({
      ...candidate,
      score: candidateScore({
        candidateArtist: candidate.artist,
        candidateTitle: candidate.title,
        popularity: candidate.popularity,
        targetArtist: params.targetArtist,
        targetTitle: params.targetTitle,
      }),
    }))
    .sort((left, right) => right.score - left.score)
    .find((candidate) => candidate.score >= params.minScore)
}

async function searchSpotifyLink(metadata: SongSearchMetadata) {
  const token = await getSpotifyAccessToken()

  if (!token) {
    return null
  }

  const queries = [
    `track:${metadata.title} artist:${metadata.artist}`,
    metadata.searchQuery,
  ]
  const candidates: PlatformCandidate[] = []

  for (const query of queries) {
    const response = await fetch(
      `https://api.spotify.com/v1/search?type=track&limit=${SEARCH_LIMIT}&market=US&q=${encodeURIComponent(query)}`,
      {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )

    if (!response.ok) {
      throw new Error(`Spotify search failed with ${response.status}`)
    }

    const payload = (await response.json()) as {
      tracks?: {
        items?: Array<{
          artists?: Array<{ name?: string }>
          external_urls?: { spotify?: string }
          name?: string
          popularity?: number
        }>
      }
    }

    for (const item of payload.tracks?.items ?? []) {
      if (!item.name || !item.external_urls?.spotify) {
        continue
      }

      candidates.push({
        artist: (item.artists ?? [])
          .map((artist) => artist.name?.trim())
          .filter(Boolean)
          .join(", "),
        popularity: item.popularity,
        title: item.name,
        url: item.external_urls.spotify,
      })
    }
  }

  const bestCandidate = pickBestCandidate({
    candidates,
    minScore: PLATFORM_SCORE_THRESHOLD.spotify,
    targetArtist: metadata.artist,
    targetTitle: metadata.title,
  })

  return bestCandidate?.url ?? null
}

async function searchAppleMusicLink(metadata: SongSearchMetadata) {
  const response = await fetch(
    `https://itunes.apple.com/search?media=music&entity=song&country=US&limit=${SEARCH_LIMIT}&term=${encodeURIComponent(metadata.searchQuery)}`,
    {
      cache: "no-store",
    },
  )

  if (!response.ok) {
    throw new Error(`Apple Music search failed with ${response.status}`)
  }

  const payload = (await response.json()) as {
    results?: Array<{
      artistName?: string
      trackName?: string
      trackViewUrl?: string
    }>
  }

  const bestCandidate = pickBestCandidate({
    candidates: (payload.results ?? [])
      .map((result) => ({
        artist: result.artistName?.trim() ?? "",
        title: result.trackName?.trim() ?? "",
        url: result.trackViewUrl?.trim() ?? "",
      }))
      .filter((candidate) => Boolean(candidate.artist) && Boolean(candidate.title) && Boolean(candidate.url)),
    minScore: PLATFORM_SCORE_THRESHOLD.appleMusic,
    targetArtist: metadata.artist,
    targetTitle: metadata.title,
  })

  return bestCandidate?.url ?? null
}

async function searchSoundCloudLink(metadata: SongSearchMetadata) {
  const response = await fetch(
    `https://soundcloud.com/search/sounds?q=${encodeURIComponent(metadata.searchQuery)}`,
    {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 Frequency/1.0",
      },
    },
  )

  if (!response.ok) {
    throw new Error(`SoundCloud search failed with ${response.status}`)
  }

  const html = await response.text()
  const candidates: PlatformCandidate[] = []

  for (const match of html.matchAll(SOUNDCLOUD_RESULT_PATTERN)) {
    const path = match[1]?.trim() ?? ""
    const rawTitle = match[2]?.trim() ?? ""

    if (!path || !rawTitle) {
      continue
    }

    const segments = path.split("/").filter(Boolean)
    if (segments.length !== 2 || SOUNDCLOUD_RESERVED_PATHS.has(segments[0] ?? "")) {
      continue
    }

    const decodedTitle = decodeHtmlEntities(rawTitle)
    const parsedTitle = parseArtistTrackFromLabel(decodedTitle)
    const candidateArtist = parsedTitle?.artist ?? cleanSoundCloudHandle(segments[0] ?? "")
    const candidateTitle = parsedTitle?.track ?? decodedTitle

    candidates.push({
      artist: candidateArtist,
      title: candidateTitle,
      url: `https://soundcloud.com${path}`,
    })
  }

  const bestCandidate = pickBestCandidate({
    candidates,
    minScore: PLATFORM_SCORE_THRESHOLD.soundcloud,
    targetArtist: metadata.artist,
    targetTitle: metadata.title,
  })

  return bestCandidate?.url ?? null
}

export async function resolveSongMetadataAndLinks(params: {
  artist: string
  title: string
  url?: string | null
}) {
  const metadata = await resolveSongSearchMetadata(params)
  const directLinks = extractDirectPlatformLinks(params.url)
  const youtube = directLinks.youtube

  logSongPlatformEvent("platform_link_resolution_started", {
    artist: metadata.artist,
    metadataSource: metadata.metadataSource,
    searchQuery: metadata.searchQuery,
    title: metadata.title,
  })

  const [spotify, appleMusic, soundcloud] = await Promise.all([
    directLinks.spotify
      ? Promise.resolve(directLinks.spotify)
      : searchSpotifyLink(metadata).catch((error) => {
          logSongPlatformEvent("spotify_link_resolution_failed", {
            artist: metadata.artist,
            error: error instanceof Error ? error.message : "Spotify link resolution failed.",
            title: metadata.title,
          })
          return null
        }),
    directLinks.appleMusic
      ? Promise.resolve(directLinks.appleMusic)
      : searchAppleMusicLink(metadata).catch((error) => {
          logSongPlatformEvent("apple_music_link_resolution_failed", {
            artist: metadata.artist,
            error: error instanceof Error ? error.message : "Apple Music link resolution failed.",
            title: metadata.title,
          })
          return null
        }),
    directLinks.soundcloud
      ? Promise.resolve(directLinks.soundcloud)
      : searchSoundCloudLink(metadata).catch((error) => {
          logSongPlatformEvent("soundcloud_link_resolution_failed", {
            artist: metadata.artist,
            error: error instanceof Error ? error.message : "SoundCloud link resolution failed.",
            title: metadata.title,
          })
          return null
        }),
  ])

  const links = {
    appleMusic,
    soundcloud,
    spotify,
    youtube,
  } satisfies RoomSharePlatformLinks

  logSongPlatformEvent("platform_link_resolution_completed", {
    artist: metadata.artist,
    hasAppleMusic: Boolean(links.appleMusic),
    hasSoundCloud: Boolean(links.soundcloud),
    hasSpotify: Boolean(links.spotify),
    hasYouTube: Boolean(links.youtube),
    metadataSource: metadata.metadataSource,
    title: metadata.title,
  })

  return {
    artist: metadata.artist,
    links,
    metadataSource: metadata.metadataSource,
    title: metadata.title,
  }
}
