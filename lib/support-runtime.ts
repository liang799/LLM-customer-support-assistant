import { respondToConversation } from "@/lib/support-assistant";
import type { SupportReply, SupportReference, TranscriptMessage } from "@/lib/support-types";
import {
  escalationTargets,
  sentiments,
  supportIntents,
} from "@/lib/support-types";

export const defaultOpenRouterModel = "openrouter/free";
export const openRouterApiUrl = "https://openrouter.ai/api/v1/chat/completions";

const systemPrompt = [
  "You are Pulse Support AI, a customer-support copilot.",
  "Return JSON only. Do not use markdown, code fences, or extra text.",
  `intent must be one of: ${supportIntents.join(", ")}.`,
  `sentiment must be one of: ${sentiments.join(", ")}.`,
  `escalationTarget must be one of: ${escalationTargets.join(", ")}.`,
  "confidence must be a number between 0 and 1.",
  "actions must contain 3 or 4 short action steps.",
  "references must contain 1 or 2 items with label and detail.",
  "Keep the assistant message concise, empathetic, and operationally useful.",
  "Use the provided grounded analysis as the default policy source when unsure.",
].join(" ");

type OpenRouterContentPart = {
  text?: string;
};

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: string | OpenRouterContentPart[];
    };
  }>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string" && entry.trim().length > 0);

const isSupportReference = (value: unknown): value is SupportReference =>
  isRecord(value) && typeof value.label === "string" && typeof value.detail === "string";

const isOneOf = <T extends string>(options: readonly T[], value: string): value is T =>
  (options as readonly string[]).includes(value);

const clampConfidence = (value: number) => Math.max(0, Math.min(1, Number(value.toFixed(2))));

const transcriptToText = (messages: readonly TranscriptMessage[]) =>
  messages.length === 0
    ? "(empty transcript)"
    : messages.map((message) => `${message.role.toUpperCase()}: ${message.content}`).join("\n\n");

export const getConfiguredSupportMode = () =>
  process.env.SUPPORT_ASSISTANT_MODE === "openrouter" ? "openrouter" : "demo";

export const hasOpenRouterCredentials = () => Boolean(process.env.OPENROUTER_API_KEY?.trim());

export const getSupportMode = () =>
  getConfiguredSupportMode() === "openrouter" && hasOpenRouterCredentials() ? "openrouter" : "demo";

export const getOpenRouterModel = () => process.env.OPENROUTER_MODEL?.trim() || defaultOpenRouterModel;

export const buildOpenRouterHeaders = () => {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY?.trim() ?? ""}`,
    "Content-Type": "application/json",
    "X-Title": process.env.OPENROUTER_APP_NAME?.trim() || "Pulse Support AI",
  };

  const referer = process.env.OPENROUTER_SITE_URL?.trim();

  if (referer) {
    headers["HTTP-Referer"] = referer;
  }

  return headers;
};

export const buildOpenRouterPayload = (
  messages: readonly TranscriptMessage[],
  fallback: SupportReply,
) => ({
  model: getOpenRouterModel(),
  temperature: 0.2,
  messages: [
    {
      role: "system",
      content: systemPrompt,
    },
    {
      role: "user",
      content: JSON.stringify(
        {
          transcript: transcriptToText(messages),
          groundedAnalysis: fallback,
        },
        null,
        2,
      ),
    },
  ],
});

export const extractJsonObject = (value: string) => {
  const stripped = value.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");

  return start === -1 || end === -1 || end < start ? null : stripped.slice(start, end + 1);
};

export const readOpenRouterContent = (value: unknown) => {
  if (typeof value === "string") {
    return value;
  }

  if (!Array.isArray(value)) {
    return null;
  }

  const content = value
    .filter(isRecord)
    .map((entry) => ("text" in entry && typeof entry.text === "string" ? entry.text : ""))
    .join("\n")
    .trim();

  return content || null;
};

export const coerceSupportReply = (candidate: unknown, fallback: SupportReply): SupportReply => {
  if (!isRecord(candidate)) {
    return fallback;
  }

  const actions = isStringArray(candidate.actions) ? candidate.actions.slice(0, 4) : fallback.actions;
  const references =
    Array.isArray(candidate.references) && candidate.references.every(isSupportReference)
      ? candidate.references.slice(0, 2)
      : fallback.references;
  const intent =
    typeof candidate.intent === "string" && isOneOf(supportIntents, candidate.intent)
      ? candidate.intent
      : fallback.intent;
  const sentiment =
    typeof candidate.sentiment === "string" && isOneOf(sentiments, candidate.sentiment)
      ? candidate.sentiment
      : fallback.sentiment;
  const escalationTarget =
    typeof candidate.escalationTarget === "string" &&
    isOneOf(escalationTargets, candidate.escalationTarget)
      ? candidate.escalationTarget
      : fallback.escalationTarget;
  const confidence =
    typeof candidate.confidence === "number" && Number.isFinite(candidate.confidence)
      ? clampConfidence(candidate.confidence)
      : fallback.confidence;

  return {
    message: typeof candidate.message === "string" ? candidate.message : fallback.message,
    intent,
    sentiment,
    confidence,
    escalationTarget,
    actions: actions.length > 0 ? actions : fallback.actions,
    references: references.length > 0 ? references : fallback.references,
    followUp: typeof candidate.followUp === "string" ? candidate.followUp : fallback.followUp,
    mode: "openrouter",
  };
};

const fetchOpenRouterReply = async (messages: readonly TranscriptMessage[], fallback: SupportReply) => {
  const response = await fetch(openRouterApiUrl, {
    method: "POST",
    headers: buildOpenRouterHeaders(),
    body: JSON.stringify(buildOpenRouterPayload(messages, fallback)),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as OpenRouterResponse;
  const content = readOpenRouterContent(payload.choices?.[0]?.message?.content);

  if (!content) {
    throw new Error("OpenRouter returned no message content.");
  }

  const json = extractJsonObject(content);

  if (!json) {
    throw new Error("OpenRouter did not return JSON.");
  }

  return coerceSupportReply(JSON.parse(json), fallback);
};

export const generateSupportReply = async (messages: readonly TranscriptMessage[]) => {
  const fallback = respondToConversation(messages);

  if (getSupportMode() === "demo") {
    return fallback;
  }

  try {
    return await fetchOpenRouterReply(messages, fallback);
  } catch {
    return fallback;
  }
};
