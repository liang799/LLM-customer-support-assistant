import { describe, expect, it } from "vitest";

import { POST, handleChatRequest, parseChatRequest } from "@/app/api/chat/route";
import { createTranscriptMessage } from "@/lib/support-assistant";

describe("chat route", () => {
  it("rejects invalid request bodies", async () => {
    const response = handleChatRequest({ nope: true });
    const payload = await response.json();

    expect(parseChatRequest(null)).toBeNull();
    expect(parseChatRequest({ nope: true })).toBeNull();
    expect(parseChatRequest({ messages: [null] })).toBeNull();
    expect(response.status).toBe(400);
    expect(payload.error).toContain("messages array");
  });

  it("returns a support reply for valid transcripts", async () => {
    const response = handleChatRequest({
      messages: [createTranscriptMessage("user", "The item arrived broken and leaking.")],
    });
    const payload = (await response.json()) as {
      reply: { intent: string };
      message: { role: string };
    };

    expect(response.status).toBe(200);
    expect(payload.reply.intent).toBe("damaged_item");
    expect(payload.message.role).toBe("assistant");
    expect(
      parseChatRequest({
        messages: [
          {
            id: "assistant-1",
            role: "assistant",
            content: "Draft reply",
            createdAt: "2026-04-07T10:00:00.000Z",
          },
        ],
      }),
    ).toEqual({
      messages: [
        {
          id: "assistant-1",
          role: "assistant",
          content: "Draft reply",
          createdAt: "2026-04-07T10:00:00.000Z",
        },
      ],
    });
  });

  it("handles malformed JSON in POST requests", async () => {
    const malformedRequest = new Request("http://localhost/api/chat", {
      method: "POST",
      body: "{not-json",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const validRequest = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [createTranscriptMessage("user", "My login reset is stuck after 2FA.")],
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const malformedResponse = await POST(malformedRequest);
    const malformedPayload = await malformedResponse.json();
    const validResponse = await POST(validRequest);
    const validPayload = await validResponse.json();

    expect(malformedResponse.status).toBe(400);
    expect(malformedPayload.error).toContain("messages array");
    expect(validResponse.status).toBe(200);
    expect(validPayload.reply.intent).toBe("account_access");
  });
});
