import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SupportDashboard } from "@/components/support-dashboard";

const buildResponse = (message: string, intent = "billing") =>
  ({
    ok: true,
    json: async () => ({
      reply: {
        message,
        intent,
        sentiment: "calm",
        confidence: 0.91,
        escalationTarget: "finance",
        actions: ["Confirm the payment details.", "Offer the reversal timeline."],
        references: [
          {
            label: "Payments Playbook",
            detail: "Finance reverses verified duplicate captures within 2 business days.",
          },
        ],
        followUp: "What is the invoice number?",
        mode: "demo",
      },
      message: {
        id: "assistant-1",
        role: "assistant",
        content: message,
        createdAt: "2026-04-07T10:00:00.000Z",
        insight: {
          message,
          intent,
          sentiment: "calm",
          confidence: 0.91,
          escalationTarget: "finance",
          actions: ["Confirm the payment details.", "Offer the reversal timeline."],
          references: [
            {
              label: "Payments Playbook",
              detail: "Finance reverses verified duplicate captures within 2 business days.",
            },
          ],
          followUp: "What is the invoice number?",
          mode: "demo",
        },
      },
    }),
  }) satisfies Pick<Response, "ok" | "json">;

describe("SupportDashboard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("ignores blank submits", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<SupportDashboard />);

    await userEvent.click(screen.getByRole("button", { name: "Generate reply" }));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("submits a typed scenario and renders the returned insight card", async () => {
    const fetchMock = vi.fn().mockResolvedValue(buildResponse("I drafted the billing reply."));
    vi.stubGlobal("fetch", fetchMock);

    render(<SupportDashboard />);

    await userEvent.type(
      screen.getByLabelText("Customer issue"),
      "The customer says they were charged twice for order 9911.",
    );
    await userEvent.click(screen.getByRole("button", { name: "Generate reply" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText("I drafted the billing reply.")).toBeInTheDocument();
    expect(screen.getByText("Follow-up")).toBeInTheDocument();
    expect(screen.getByText("What is the invoice number?")).toBeInTheDocument();
  });

  it("prevents duplicate quick-prompt sends while a request is in flight", async () => {
    let resolveFetch: ((value: Pick<Response, "ok" | "json">) => void) | undefined;
    const fetchMock = vi.fn(
      () =>
        new Promise<Pick<Response, "ok" | "json">>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<SupportDashboard />);

    await userEvent.click(
      screen.getByRole("button", {
        name: "My package has been stuck in transit for four days and I need it before Friday.",
      }),
    );
    await userEvent.click(
      screen.getByRole("button", {
        name: "I was charged twice for the same order and my bank is asking questions.",
      }),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFetch?.(buildResponse("Still on the first request.", "order_tracking"));

    expect(await screen.findByText("Still on the first request.")).toBeInTheDocument();
  });

  it("shows the retry message when the API reports an error", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<SupportDashboard />);

    await userEvent.type(
      screen.getByLabelText("Customer issue"),
      "The customer cannot log in after changing their phone.",
    );
    await userEvent.click(screen.getByRole("button", { name: "Generate reply" }));

    expect(
      await screen.findByText(
        "I hit a temporary handoff issue before the policy-backed reply completed. Please resend the last message and I’ll try again.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("The assistant could not complete that handoff. Resend the message to retry."),
    ).toBeInTheDocument();
  });
});
