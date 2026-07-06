// Audio transcription adapter (Whisper).
// Works with any OpenAI-compatible /audio/transcriptions endpoint.
// Defaults to Groq (free) when GROQ_API_KEY is set, otherwise falls back to OpenAI.
//   GROQ_API_KEY or OPENAI_API_KEY  provides the credentials
//   AI_TRANSCRIBE_PROVIDER          optional override ("groq" | "openai")
//   WHISPER_MODEL                   optional; empty uses the provider default

type TranscribeProvider = "groq" | "openai";

const ENDPOINTS: Record<TranscribeProvider, string> = {
  groq: "https://api.groq.com/openai/v1/audio/transcriptions",
  openai: "https://api.openai.com/v1/audio/transcriptions",
};

const DEFAULT_MODELS: Record<TranscribeProvider, string> = {
  groq: "whisper-large-v3-turbo",
  openai: "whisper-1",
};

function resolveProvider(): TranscribeProvider {
  const explicit = process.env.AI_TRANSCRIBE_PROVIDER;
  if (explicit === "groq" || explicit === "openai") return explicit;
  if (process.env.GROQ_API_KEY) return "groq";
  return "openai";
}

function apiKeyFor(provider: TranscribeProvider): string {
  const key =
    provider === "groq" ? process.env.GROQ_API_KEY : process.env.OPENAI_API_KEY;
  return key ?? "";
}

export function transcriptionConfigured(): boolean {
  return Boolean(apiKeyFor(resolveProvider()));
}

/** Transcribe an audio file (Blob/File) to text via Whisper. */
export async function transcribeAudio(
  file: Blob,
  filename = "audio.m4a",
): Promise<string> {
  const provider = resolveProvider();
  const apiKey = apiKeyFor(provider);
  if (!apiKey) {
    throw new Error("Transcription requires GROQ_API_KEY or OPENAI_API_KEY.");
  }
  const model = process.env.WHISPER_MODEL || DEFAULT_MODELS[provider];

  const form = new FormData();
  form.append("file", file, filename);
  form.append("model", model);

  const res = await fetch(ENDPOINTS[provider], {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Transcription error ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  return (json.text as string) ?? "";
}
