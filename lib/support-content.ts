import type { StatusCard, SupportPlaybook } from "@/lib/support-types";

export const supportPlaybooks: readonly SupportPlaybook[] = [
  {
    intent: "order_tracking",
    label: "Shipment Recovery",
    overview:
      "We can confirm the latest carrier scan, set a delivery expectation, and open a logistics trace when the parcel has stalled.",
    cues: [
      "track",
      "tracking",
      "shipment",
      "package",
      "delivery",
      "delayed",
      "late",
      "missing",
      "transit",
      "courier",
    ],
    actionPlan: [
      "Confirm the latest carrier scan and compare it to the promised window.",
      "Share the next delivery checkpoint or start a trace if the parcel is stalled.",
      "Offer a replacement path when the package is confirmed lost.",
    ],
    referenceLabel: "Fulfilment SLA",
    referenceDetail: "Parcels with no movement for 72 hours qualify for a logistics trace.",
    escalationTarget: "logistics",
    escalationWhen: ["stolen", "medical", "birthday", "72 hours", "travel"],
    followUp:
      "Send the order number or the latest tracking link and I will tighten the response.",
  },
  {
    intent: "refund",
    label: "Refund Resolution",
    overview:
      "We can verify return eligibility, explain the refund timeline, and document the next checkpoint before finance releases the credit.",
    cues: [
      "refund",
      "return",
      "money",
      "credit",
      "cancelled",
      "canceled",
      "send back",
      "wrong size",
      "money back",
    ],
    actionPlan: [
      "Confirm whether the order is still inside the 30-day return window.",
      "Explain the inspection and refund posting timeline clearly.",
      "Offer store credit only when the customer prefers a faster resolution.",
    ],
    referenceLabel: "Returns Policy",
    referenceDetail: "Approved refunds post back to the original payment method within 5 to 10 business days.",
    escalationTarget: "finance",
    escalationWhen: ["bank dispute", "chargeback", "attorney", "fraud"],
    followUp:
      "If you have the order number and the return scan date, share both so I can draft the exact reply.",
  },
  {
    intent: "billing",
    label: "Billing Triage",
    overview:
      "We can verify whether a charge is duplicated, explain pending authorisations, and route true payment issues to finance.",
    cues: [
      "charged",
      "charge",
      "invoice",
      "receipt",
      "payment",
      "billing",
      "card",
      "double",
      "duplicate",
      "fee",
    ],
    actionPlan: [
      "Check whether the extra amount is a pending authorisation or a settled duplicate.",
      "Confirm the last four digits of the payment method before sharing account detail.",
      "Escalate confirmed duplicate captures to finance for reversal.",
    ],
    referenceLabel: "Payments Playbook",
    referenceDetail: "Duplicate settled captures are reversed by finance within 2 business days after verification.",
    escalationTarget: "finance",
    escalationWhen: ["fraud", "stolen card", "bank complaint", "multiple times"],
    followUp:
      "Tell me whether the charge is pending or posted, plus the invoice or order number if you have it.",
  },
  {
    intent: "subscription",
    label: "Retention Concierge",
    overview:
      "We can adjust renewal timing, swap plans, and confirm cancellation outcomes without losing billing clarity.",
    cues: [
      "subscription",
      "renewal",
      "renew",
      "plan",
      "cancel",
      "downgrade",
      "upgrade",
      "membership",
      "monthly",
      "annual",
    ],
    actionPlan: [
      "Confirm the active plan, renewal date, and whether the customer wants to keep access until period end.",
      "Recommend downgrade or pause paths when cancellation is due to price sensitivity.",
      "Clarify exactly when renewal billing stops.",
    ],
    referenceLabel: "Plan Management Guide",
    referenceDetail: "Plan changes are immediate, while cancellations keep access until the end of the paid term.",
    escalationTarget: "retention",
    escalationWhen: ["enterprise", "team plan", "contract", "procurement"],
    followUp:
      "Share the current plan name or renewal date and I will tailor the response.",
  },
  {
    intent: "account_access",
    label: "Identity Recovery",
    overview:
      "We can verify access issues, protect the account, and guide the customer through a secure recovery flow.",
    cues: [
      "login",
      "password",
      "sign in",
      "locked",
      "access",
      "verification",
      "two factor",
      "2fa",
      "cannot log",
      "reset",
    ],
    actionPlan: [
      "Confirm whether the customer still controls the email address on file.",
      "Run the secure password reset or verification flow before discussing account detail.",
      "Escalate to identity support if the account appears compromised.",
    ],
    referenceLabel: "Account Security Standard",
    referenceDetail: "High-risk account changes require identity verification before manual updates.",
    escalationTarget: "identity",
    escalationWhen: ["hacked", "compromised", "breach", "stolen phone"],
    followUp:
      "Tell me whether the customer can still access the inbox linked to the account.",
  },
  {
    intent: "damaged_item",
    label: "Damage Claim",
    overview:
      "We can gather evidence, confirm the replacement or refund path, and route warehouse follow-up when packaging or handling failed.",
    cues: [
      "damaged",
      "broken",
      "defect",
      "cracked",
      "shattered",
      "arrived broken",
      "faulty",
      "leaking",
      "not working",
      "dented",
    ],
    actionPlan: [
      "Ask for photos of the product and outer packaging if they are available.",
      "Offer a replacement first when stock exists and the customer wants speed.",
      "Escalate repeat breakage patterns to logistics or warehouse quality.",
    ],
    referenceLabel: "Quality Assurance Runbook",
    referenceDetail: "Damage reports filed within 7 days of delivery are eligible for replacement or refund.",
    escalationTarget: "logistics",
    escalationWhen: ["injury", "hazard", "glass", "chemical", "same batch"],
    followUp:
      "If photos or the delivery date are available, send them and I will draft a stronger reply.",
  },
];

export const quickPrompts = [
  "My package has been stuck in transit for four days and I need it before Friday.",
  "I was charged twice for the same order and my bank is asking questions.",
  "The item arrived cracked and the customer wants a replacement today.",
  "I cannot log in after changing my phone and I think 2FA is blocking me.",
] as const;

export const statusCards: readonly StatusCard[] = [
  {
    label: "Mode",
    value: "Free-model ready",
    detail: "Uses OpenRouter's free router when configured, with a deterministic demo fallback.",
  },
  {
    label: "Coverage target",
    value: "100%",
    detail: "Vitest is configured to fail the build if statements, branches, or functions slip.",
  },
  {
    label: "Deployment",
    value: "Vercel-ready",
    detail: "The app uses the Next.js App Router and a server route that deploys cleanly on Vercel.",
  },
];

export const trustHighlights = [
  "Intent detection and escalation are pure functions, so the core support logic stays testable.",
  "The assistant cites the matching playbook and recommended actions instead of improvising vague replies.",
  "The backend can call a free OpenRouter model now and still falls back safely when credentials are missing.",
] as const;
