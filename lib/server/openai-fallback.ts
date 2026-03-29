import { removeUndefinedDeep } from "@/lib/firebase/sanitize";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_FALLBACK_MODEL = process.env.OPENAI_FALLBACK_MODEL ?? "gpt-4o-mini";

export type OpenAIFallbackCandidate = {
  artist: string;
  title: string;
  videoId: string;
  thumbnail: string | null;
  publishedAt: string;
  source: "trusted-channel" | "broad-fallback";
  channelId: string;
  channelTitle: string;
  channelRole?: "official" | "topic" | "unreleased" | "vevo";
  score: number;
  confidenceScore: number;
  confidenceTier: "high" | "medium" | "low";
  confidenceReasons: string[];
  recommendationPath?: "seed-artist" | "collaborator-remix-path" | "similar-artist-expansion";
};

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

function getOpenAIOutputText(payload: OpenAIResponse) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text;
  }

  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && typeof content.text === "string" && content.text.trim()) {
        return content.text;
      }
    }
  }

  return undefined;
}

export function canUseOpenAIFallback() {
  return Boolean(OPENAI_API_KEY);
}

export function logOpenAIFallbackEvent(event: string, payload: Record<string, unknown>) {
  console.log("[frequency][openai-fallback]", {
    event,
    ...payload,
  });
}

export async function chooseCandidateWithOpenAI(params: {
  uid: string;
  artistNames: string[];
  candidates: OpenAIFallbackCandidate[];
}) {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const candidatePayload = params.candidates.map((candidate, index) =>
    removeUndefinedDeep({
      index,
      artist: candidate.artist,
      title: candidate.title,
      videoId: candidate.videoId,
      source: candidate.source,
      channelTitle: candidate.channelTitle,
      channelRole: candidate.channelRole,
      publishedAt: candidate.publishedAt,
      score: candidate.score,
    }),
  );

  logOpenAIFallbackEvent("openai_fallback_started", {
    uid: params.uid,
    candidateCount: candidatePayload.length,
    artistNames: params.artistNames,
  });

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_FALLBACK_MODEL,
      store: false,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "Select the single best YouTube song recommendation from the provided candidates. Never invent a new candidate. Prefer official or topic uploads, clean song titles, and the strongest alignment with the artist identity.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify({
                artistNames: params.artistNames,
                candidates: candidatePayload,
              }),
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "recommendation_candidate_selection",
          strict: true,
          schema: {
            type: "object",
            properties: {
              selectedIndex: {
                type: "integer",
                minimum: 0,
                maximum: Math.max(0, candidatePayload.length - 1),
              },
              rationale: {
                type: "string",
              },
            },
            required: ["selectedIndex", "rationale"],
            additionalProperties: false,
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    logOpenAIFallbackEvent("openai_fallback_failed", {
      uid: params.uid,
      status: response.status,
      body,
    });
    throw new Error(`OpenAI fallback failed with ${response.status}`);
  }

  const payload = (await response.json()) as OpenAIResponse;
  const outputText = getOpenAIOutputText(payload);
  const parsed = JSON.parse(outputText ?? "{}") as {
    selectedIndex?: number;
    rationale?: string;
  };

  if (
    typeof parsed.selectedIndex !== "number" ||
    parsed.selectedIndex < 0 ||
    parsed.selectedIndex >= params.candidates.length
  ) {
    logOpenAIFallbackEvent("openai_fallback_failed", {
      uid: params.uid,
      reason: "invalid_selection",
      payload: outputText ?? null,
    });
    throw new Error("OpenAI fallback returned an invalid selection.");
  }

  const selectedCandidate = params.candidates[parsed.selectedIndex];
  logOpenAIFallbackEvent("openai_fallback_selected_candidate", {
    uid: params.uid,
    selectedIndex: parsed.selectedIndex,
    videoId: selectedCandidate.videoId,
    rationale: parsed.rationale ?? null,
  });

  return selectedCandidate;
}
