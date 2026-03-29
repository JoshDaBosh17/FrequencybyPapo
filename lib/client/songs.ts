export type SongResolutionResult = {
  inputTitle: string;
  inputArtist: string;
  canonicalTitle: string;
  canonicalArtist: string;
  exactMatch: boolean;
  shouldConfirm: boolean;
  confidence: number;
  matched: boolean;
};

export async function resolveSongName(title: string, artist: string) {
  const response = await fetch("/api/songs/resolve", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ artist, title }),
  });

  if (!response.ok) {
    throw new Error("Could not validate song name.");
  }

  return (await response.json()) as SongResolutionResult;
}
