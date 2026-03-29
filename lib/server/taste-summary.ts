import {
  DEFAULT_TASTE_SUMMARY_OVERVIEW,
  normalizeGeneratedTasteSummaryOverview,
} from "@/lib/frequency/taste-summary";

const TASTE_SUMMARY_SYSTEM_PROMPT = [
  "You are writing short music taste summaries for a premium app called Frequency.",
  "Your job is to translate a user's genres into a clear, human-readable vibe statement that reflects how they are feeling.",
  "",
  "Style:",
  "- 1 sentence only",
  "- Max 14 words",
  "- Natural, conversational, but still clean and premium",
  "- Combine genre description with emotional interpretation",
  "",
  "Structure:",
  "- First describe the sound briefly, blending genres naturally",
  "- Then interpret the user's energy or mood",
  "",
  "Tone:",
  "- Clear and human",
  "- Slightly expressive",
  "- Not overly poetic or abstract",
  "- Not robotic or generic",
  "",
  "Avoid:",
  '- "vibing with"',
  '- "a mix of"',
  '- "combining"',
  "- Robotic genre listing",
  "- Overly dramatic or metaphor-heavy language",
  "- Avoid emojis",
  "- Avoid mentioning percentages or weights",
  "- Keep it present-tense and personal in tone",
  "",
  'Input: house, disco, dance',
  'Output: {"overview":"Energetic house with disco grooves - you\'re feeling lively."}',
  "",
  'Input: house, techno, electronic',
  'Output: {"overview":"Driving electronic and house rhythms - you\'re in a focused, high-energy zone."}',
  "",
  'Input: hip-hop, funk',
  'Output: {"overview":"Funky hip-hop grooves - you\'re feeling loose and confident."}',
  "",
  'Input: indie, lo-fi',
  'Output: {"overview":"Soft indie and lo-fi textures - you\'re in a calm, reflective mood."}',
  "",
  'Bad output: {"overview":"Vibing with upbeat house and funky hip-hop grooves."}',
  'Bad output: {"overview":"A mix of house and disco vibes."}',
  'Bad output: {"overview":"Feeling energetic music."}',
].join("\n");

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

type TasteSummaryPayload = {
  overview: string;
};

type TasteSummaryGenerationResult = TasteSummaryPayload & {
  source: "openai" | "fallback";
  fallbackReason?: string;
};

type GenreInput = {
  name: string;
  weight?: number;
};

function fallbackTasteSummary() {
  return {
    overview: DEFAULT_TASTE_SUMMARY_OVERVIEW,
    source: "fallback",
  } satisfies TasteSummaryGenerationResult;
}

function logTasteSummaryEvent(event: string, payload: Record<string, unknown>) {
  console.log("[frequency][taste-summary]", {
    event,
    ...payload,
  });
}

function sanitizeGenreInputs(genres: GenreInput[]) {
  return genres
    .map((genre) => ({
      name: genre.name.trim(),
      weight: typeof genre.weight === "number" ? genre.weight : undefined,
    }))
    .filter((genre) => genre.name)
    .slice(0, 10);
}

function parseTasteSummaryPayload(outputText: string | undefined) {
  const parsed = JSON.parse(outputText ?? "{}") as Partial<TasteSummaryPayload>;
  const overview = normalizeGeneratedTasteSummaryOverview(parsed.overview);

  if (!overview) {
    return null;
  }

  return {
    overview,
  } satisfies TasteSummaryPayload;
}

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

function getTasteSummaryOpenAIConfig() {
  return {
    apiKey: process.env.OPENAI_API_KEY ?? null,
    model:
      process.env.OPENAI_TASTE_SUMMARY_MODEL ??
      process.env.OPENAI_FALLBACK_MODEL ??
      "gpt-4o-mini",
  };
}

export function canUseTasteSummaryOpenAI() {
  return Boolean(getTasteSummaryOpenAIConfig().apiKey);
}

export async function generateTasteSummaryFromGenres(params: {
  uid: string;
  genres: GenreInput[];
}): Promise<TasteSummaryGenerationResult> {
  const sanitizedGenres = sanitizeGenreInputs(params.genres);
  const { apiKey, model } = getTasteSummaryOpenAIConfig();

  if (!sanitizedGenres.length) {
    logTasteSummaryEvent("taste_summary_fallback", {
      uid: params.uid,
      reason: "missing_genres",
      genreCount: 0,
    });
    return {
      ...fallbackTasteSummary(),
      fallbackReason: "missing_genres",
    };
  }

  logTasteSummaryEvent("taste_summary_called", {
    uid: params.uid,
    genreCount: sanitizedGenres.length,
    genres: sanitizedGenres,
    hasApiKey: Boolean(apiKey),
    model,
  });

  if (!apiKey) {
    logTasteSummaryEvent("taste_summary_fallback", {
      uid: params.uid,
      reason: "missing_api_key",
      genreCount: sanitizedGenres.length,
    });
    return {
      ...fallbackTasteSummary(),
      fallbackReason: "missing_api_key",
    };
  }

  logTasteSummaryEvent("taste_summary_started", {
    uid: params.uid,
    genreCount: sanitizedGenres.length,
    genres: sanitizedGenres.map((genre) => genre.name),
  });

  try {
    logTasteSummaryEvent("taste_summary_request_started", {
      uid: params.uid,
      model,
      genreCount: sanitizedGenres.length,
    });

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        store: false,
        temperature: 0.5,
        max_output_tokens: 60,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: TASTE_SUMMARY_SYSTEM_PROMPT,
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: JSON.stringify({
                  genres: sanitizedGenres,
                }),
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "taste_summary",
            strict: true,
            schema: {
              type: "object",
              properties: {
                overview: {
                  type: "string",
                },
              },
              required: ["overview"],
              additionalProperties: false,
            },
          },
        },
      }),
    });

    const responseText = await response.text();

    logTasteSummaryEvent("taste_summary_response_received", {
      uid: params.uid,
      status: response.status,
      ok: response.ok,
      bodyPreview: responseText.slice(0, 500),
    });

    if (!response.ok) {
      logTasteSummaryEvent("taste_summary_fallback", {
        uid: params.uid,
        reason: "response_not_ok",
        status: response.status,
        body: responseText,
      });
      return {
        ...fallbackTasteSummary(),
        fallbackReason: "response_not_ok",
      };
    }

    const payload = JSON.parse(responseText) as OpenAIResponse;
    const outputText = getOpenAIOutputText(payload);

    logTasteSummaryEvent("taste_summary_response_parsed", {
      uid: params.uid,
      outputText: outputText ?? null,
    });

    const parsed = parseTasteSummaryPayload(outputText);

    if (!parsed) {
      logTasteSummaryEvent("taste_summary_fallback", {
        uid: params.uid,
        reason: "invalid_output",
        payload: outputText ?? null,
      });
      return {
        ...fallbackTasteSummary(),
        fallbackReason: "invalid_output",
      };
    }

    logTasteSummaryEvent("taste_summary_generated", {
      uid: params.uid,
      overview: parsed.overview,
    });

    return {
      ...parsed,
      source: "openai",
    };
  } catch (error) {
    logTasteSummaryEvent("taste_summary_fallback", {
      uid: params.uid,
      reason: "request_failed",
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return {
      ...fallbackTasteSummary(),
      fallbackReason: "request_failed",
    };
  }
}
