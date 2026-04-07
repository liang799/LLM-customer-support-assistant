import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { ChatTranscript } from "@/components/chat-transcript";
import { createTranscriptMessage } from "@/lib/support-assistant";
import type { SupportReply } from "@/lib/support-types";

describe("ChatTranscript", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-07T11:45:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders both transcript roles, insights, and the typing indicator", () => {
    const insight: SupportReply = {
      message: "I can help with a refund.",
      intent: "refund",
      sentiment: "calm",
      confidence: 0.86,
      escalationTarget: "none",
      actions: ["Confirm the return window.", "Explain the payout timeline."],
      references: [
        {
          label: "Returns Policy",
          detail: "Refunds settle in 5 to 10 business days.",
        },
      ],
      followUp: "What is the return scan date?",
      mode: "demo",
    };

    render(
      <ChatTranscript
        isReplying
        messages={[
          createTranscriptMessage("assistant", "I can help with the refund flow.", insight),
          createTranscriptMessage("user", "The customer wants their money back."),
        ]}
      />,
    );

    expect(screen.getByText("Support Copilot")).toBeInTheDocument();
    expect(screen.getByText("Agent Draft")).toBeInTheDocument();
    expect(screen.getByText("Intent: refund")).toBeInTheDocument();
    expect(screen.getByText("Explain the payout timeline.")).toBeInTheDocument();
    expect(screen.getByText("Returns Policy")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
