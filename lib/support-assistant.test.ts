import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
  createStarterConversation,
  createTranscriptMessage,
  createWelcomeMessage,
  detectSentiment,
  extractReference,
  getLatestCustomerMessage,
  getLatestInsight,
  getQuickPromptByIndex,
  respondToConversation,
} from "@/lib/support-assistant";

describe("support assistant helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-07T10:15:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates the starter conversation and reads the latest customer insight", () => {
    const starterConversation = createStarterConversation();
    const customerMessage = createTranscriptMessage(
      "user",
      "My package is delayed and I need order #ABCD-1234 before Friday.",
    );
    const reply = respondToConversation([...starterConversation, customerMessage]);
    const assistantReply = createTranscriptMessage("assistant", reply.message, reply);

    expect(starterConversation).toHaveLength(1);
    expect(starterConversation[0]?.role).toBe("assistant");
    expect(createWelcomeMessage().content).toContain("Share a customer issue");
    expect(getLatestCustomerMessage([...starterConversation, customerMessage])).toBe(
      "My package is delayed and I need order #ABCD-1234 before Friday.",
    );
    expect(getLatestInsight([...starterConversation, customerMessage, assistantReply])).toEqual(reply);
  });

  it("detects sentiments, extracts references, and falls back to the first quick prompt", () => {
    expect(detectSentiment("I need this today, please handle it ASAP.")).toBe("urgent");
    expect(detectSentiment("I am frustrated and still waiting for help.")).toBe("frustrated");
    expect(detectSentiment("Can you help adjust my subscription plan?")).toBe("calm");

    expect(extractReference("Please review invoice #inv-9088 for me.")).toBe("INV-9088");
    expect(extractReference("There is no reference in this note.")).toBeNull();
    expect(getQuickPromptByIndex(99)).toBe(getQuickPromptByIndex(0));
  });

  it("builds a finance escalation for duplicate billing problems", () => {
    const billingReply = respondToConversation([
      createTranscriptMessage(
        "user",
        "I was charged twice for invoice #INV-9088 and my bank thinks it could be fraud.",
      ),
    ]);

    expect(billingReply.intent).toBe("billing");
    expect(billingReply.escalationTarget).toBe("finance");
    expect(billingReply.message).toContain("finance specialist");
    expect(billingReply.actions[0]).toContain("INV-9088");
    expect(billingReply.references[0]?.label).toBe("Payments Playbook");
  });

  it("keeps calm subscription changes in the standard queue", () => {
    const subscriptionReply = respondToConversation([
      createTranscriptMessage("user", "Please cancel my annual subscription at the end of the term."),
    ]);

    expect(subscriptionReply.intent).toBe("subscription");
    expect(subscriptionReply.sentiment).toBe("calm");
    expect(subscriptionReply.escalationTarget).toBe("none");
    expect(subscriptionReply.message).toContain("standard queue");
    expect(subscriptionReply.followUp).toContain("plan name");
  });

  it("adds empathy for frustrated product-damage reports", () => {
    const damageReply = respondToConversation([
      createTranscriptMessage(
        "user",
        "I am frustrated because the item arrived broken and not working.",
      ),
    ]);

    expect(damageReply.intent).toBe("damaged_item");
    expect(damageReply.sentiment).toBe("frustrated");
    expect(damageReply.actions[1]).toContain("Acknowledge the impact");
    expect(damageReply.message).toContain("customer is frustrated");
  });

  it("routes urgent delivery requests to logistics", () => {
    const trackingReply = respondToConversation([
      createTranscriptMessage(
        "user",
        "My package is delayed, I need it today for travel, and order #SHIP-7788 is still stuck.",
      ),
    ]);

    expect(trackingReply.intent).toBe("order_tracking");
    expect(trackingReply.sentiment).toBe("urgent");
    expect(trackingReply.escalationTarget).toBe("logistics");
    expect(trackingReply.message).toContain("high-priority case");
    expect(trackingReply.message).toContain("logistics specialist");
  });

  it("falls back cleanly for urgent unknown issues and empty transcripts", () => {
    const unknownReply = respondToConversation([
      createTranscriptMessage(
        "user",
        "This is urgent and weird. Case #CASE-77 keeps failing for a reason I cannot place.",
      ),
    ]);

    const emptyReply = respondToConversation([]);

    expect(unknownReply.intent).toBe("unknown");
    expect(unknownReply.escalationTarget).toBe("priority-desk");
    expect(unknownReply.message).toContain("reference CASE-77");
    expect(emptyReply.intent).toBe("unknown");
    expect(emptyReply.followUp).toContain("What exact outcome");
  });
});
