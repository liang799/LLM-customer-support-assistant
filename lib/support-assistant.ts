import { quickPrompts, supportPlaybooks } from "@/lib/support-content";
import type {
  EscalationTarget,
  Sentiment,
  SupportPlaybook,
  SupportReply,
  TranscriptMessage,
} from "@/lib/support-types";

const urgentKeywords = [
  "asap",
  "urgent",
  "immediately",
  "today",
  "travel",
  "medical",
  "deadline",
  "legal",
];

const frustratedKeywords = [
  "angry",
  "annoyed",
  "frustrated",
  "ridiculous",
  "still waiting",
  "upset",
  "terrible",
  "disappointed",
];

const normalizeText = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9#\s-]/g, " ").replace(/\s+/g, " ").trim();

const includesAny = (value: string, cues: readonly string[]) =>
  cues.some((cue) => normalizeText(value).includes(cue));

const scorePlaybook = (message: string, playbook: SupportPlaybook) => {
  const normalized = normalizeText(message);

  return playbook.cues.reduce(
    (score, cue) => (normalized.includes(cue) ? score + 1 : score),
    0,
  );
};

const pickPlaybook = (message: string) =>
  supportPlaybooks.reduce<{ playbook: SupportPlaybook | null; score: number }>(
    (bestMatch, playbook) => {
      const score = scorePlaybook(message, playbook);

      return score > bestMatch.score ? { playbook, score } : bestMatch;
    },
    { playbook: null, score: 0 },
  );

export const detectSentiment = (message: string): Sentiment => {
  const normalized = normalizeText(message);

  if (includesAny(normalized, urgentKeywords)) {
    return "urgent";
  }

  if (includesAny(normalized, frustratedKeywords)) {
    return "frustrated";
  }

  return "calm";
};

export const extractReference = (message: string) =>
  message.match(/\b(?:order|case|ticket|invoice)\s*#?\s*([A-Z0-9-]{4,})\b/i)?.[1]?.toUpperCase() ??
  null;

const escalationLabels: Record<EscalationTarget, string> = {
  none: "standard support queue",
  logistics: "logistics specialist",
  finance: "finance specialist",
  retention: "retention desk",
  identity: "identity recovery team",
  "priority-desk": "priority response desk",
};

const formatEscalationTarget = (target: EscalationTarget) => escalationLabels[target];

const buildFallbackReply = (message: string): SupportReply => {
  const sentiment = detectSentiment(message);
  const reference = extractReference(message);

  return {
    message: [
      sentiment === "urgent"
        ? "I’m treating this as a priority request."
        : "I can help shape the next support reply.",
      reference
        ? `I captured reference ${reference}.`
        : "If you share an order, case, or invoice number, I can make the response more specific.",
      "From here, I’d clarify whether this is a delivery, billing, access, subscription, refund, or product-quality issue before sending the final reply.",
    ].join(" "),
    intent: "unknown",
    sentiment,
    confidence: 0.38,
    escalationTarget: sentiment === "urgent" ? "priority-desk" : "none",
    actions: [
      "Ask one clarifying question to confirm the issue category.",
      "Capture any order, invoice, or ticket reference the customer already mentioned.",
      "Confirm the promised timeline before offering a next step.",
    ],
    references: [
      {
        label: "Triage Pattern",
        detail: "Unknown issues should be narrowed to one support lane before a commitment is made.",
      },
    ],
    followUp: "What exact outcome does the customer want right now: refund, replacement, access, or status?",
    mode: "demo",
  };
};

const buildReplyMessage = (
  playbook: SupportPlaybook,
  sentiment: Sentiment,
  reference: string | null,
  escalationTarget: EscalationTarget,
) => {
  const opening =
    sentiment === "urgent"
      ? "I’m treating this as a high-priority case."
      : sentiment === "frustrated"
        ? "I can see why the customer is frustrated."
        : "I’ve mapped this to the most likely support workflow.";

  const referenceLine = reference
    ? `I captured reference ${reference} for the follow-up.`
    : "If you share the order, case, or invoice reference, I can tighten the wording further.";

  const escalationLine =
    escalationTarget === "none"
      ? "This can stay in the standard queue if the next verification step succeeds."
      : `If the next check fails, route it to the ${formatEscalationTarget(escalationTarget)}.`;

  return [opening, playbook.overview, referenceLine, escalationLine].join(" ");
};

const buildActions = (
  playbook: SupportPlaybook,
  sentiment: Sentiment,
  reference: string | null,
) => {
  const tailoredActions = reference
    ? [`Confirm the details tied to reference ${reference} before replying.`]
    : ["Ask for the order, case, or invoice reference before closing the loop."];

  const calmingAction =
    sentiment === "frustrated" || sentiment === "urgent"
      ? ["Acknowledge the impact before moving into policy or troubleshooting."]
      : [];

  return [...tailoredActions, ...calmingAction, ...playbook.actionPlan].slice(0, 4);
};

export const getLatestCustomerMessage = (messages: readonly TranscriptMessage[]) =>
  [...messages].reverse().find((entry) => entry.role === "user")?.content ?? "";

export const createTranscriptMessage = (
  role: TranscriptMessage["role"],
  content: string,
  insight?: SupportReply,
): TranscriptMessage => ({
  id: crypto.randomUUID(),
  role,
  content,
  createdAt: new Date().toISOString(),
  insight,
});

export const createWelcomeMessage = () =>
  createTranscriptMessage(
    "assistant",
    "Share a customer issue and I’ll draft the response, next actions, escalation path, and supporting policy signal.",
  );

export const createStarterConversation = () => [createWelcomeMessage()];

export const respondToConversation = (messages: readonly TranscriptMessage[]): SupportReply => {
  const customerMessage = getLatestCustomerMessage(messages);
  const { playbook, score } = pickPlaybook(customerMessage);

  if (!customerMessage || !playbook || score === 0) {
    return buildFallbackReply(customerMessage);
  }

  const sentiment = detectSentiment(customerMessage);
  const reference = extractReference(customerMessage);
  const shouldEscalate =
    sentiment === "urgent" || includesAny(customerMessage, playbook.escalationWhen);
  const escalationTarget = shouldEscalate ? playbook.escalationTarget : "none";
  const confidence = Math.min(0.97, Number((0.58 + score * 0.07).toFixed(2)));

  return {
    message: buildReplyMessage(playbook, sentiment, reference, escalationTarget),
    intent: playbook.intent,
    sentiment,
    confidence,
    escalationTarget,
    actions: buildActions(playbook, sentiment, reference),
    references: [
      {
        label: playbook.referenceLabel,
        detail: playbook.referenceDetail,
      },
    ],
    followUp: playbook.followUp,
    mode: "demo",
  };
};

export const getLatestInsight = (messages: readonly TranscriptMessage[]) =>
  [...messages].reverse().find((entry) => entry.role === "assistant" && entry.insight)?.insight ?? null;

export const getQuickPromptByIndex = (index: number) => quickPrompts[index] ?? quickPrompts[0];
