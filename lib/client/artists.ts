export type ArtistResolutionResult = {
  input: string;
  canonicalName: string;
  exactMatch: boolean;
  shouldConfirm: boolean;
  confidence: number;
  matched: boolean;
};

export async function resolveArtistName(input: string) {
  const response = await fetch("/api/artists/resolve", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input }),
  });

  if (!response.ok) {
    throw new Error("Could not validate artist name.");
  }

  return (await response.json()) as ArtistResolutionResult;
}
