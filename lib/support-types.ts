export const supportIntents = [
  "order_tracking",
  "refund",
  "billing",
  "subscription",
  "account_access",
  "damaged_item",
  "unknown",
] as const;

export type SupportIntent = (typeof supportIntents)[number];

export const sentiments = ["calm", "frustrated", "urgent"] as const;

export type Sentiment = (typeof sentiments)[number];

export const escalationTargets = [
  "none",
  "logistics",
  "finance",
  "retention",
  "identity",
  "priority-desk",
] as const;

export type EscalationTarget = (typeof escalationTargets)[number];

export type ChatRole = "assistant" | "user";

export type SupportReference = {
  label: string;
  detail: string;
};

export type SupportReply = {
  message: string;
  intent: SupportIntent;
  sentiment: Sentiment;
  confidence: number;
  escalationTarget: EscalationTarget;
  actions: string[];
  references: SupportReference[];
  followUp: string;
  mode: "demo";
};

export type TranscriptMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  insight?: SupportReply;
};

export type SupportPlaybook = {
  intent: Exclude<SupportIntent, "unknown">;
  label: string;
  overview: string;
  cues: readonly string[];
  actionPlan: readonly string[];
  referenceLabel: string;
  referenceDetail: string;
  escalationTarget: Exclude<EscalationTarget, "none">;
  escalationWhen: readonly string[];
  followUp: string;
};

export type StatusCard = {
  label: string;
  value: string;
  detail: string;
};
