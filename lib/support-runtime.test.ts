import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createTranscriptMessage, respondToConversation } from "@/lib/support-assistant";
import {
  buildOpenRouterHeaders,
  buildOpenRouterPayload,
  coerceSupportReply,
  defaultOpenRouterModel,
  extractJsonObject,
  generateSupportReply,
  getConfiguredSupportMode,
  getOpenRouterModel,
  getSupportMode,
  hasOpenRouterCredentials,
  openRouterApiUrl,
  readOpenRouterContent,
} from "@/lib/support-runtime";
import type { SupportReply } from "@/lib/support-types";

const originalEnv = { ...process.env };

const billingMessage = createTranscriptMessage(
  "user",
  "I was charged twice for invoice #INV-9088 and my bank thinks it could be fraud.",
);

const fallbackReply = respondToConversation([billingMessage]);

const openRouterJsonReply = JSON.stringify({
  message: "I can help investigate the duplicate charge and guide the next steps.",
  intent: "billing",
  sentiment: "urgent",
  confidence: 1.4,
  escalationTarget: "finance",
  actions: [
    "Acknowledge the duplicate charge.",
    "Confirm whether the charge is pending or settled.",
    "Verify the invoice reference.",
    "Route confirmed duplicates to finance.",
  ],
  references: [
    {
      label: "Payments Playbook",
      detail: "Finance reviews duplicate captures within 2 business days.",
    },
  ],
  followUp: "What is the posted invoice reference?",
});

describe("support runtime", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.SUPPORT_ASSISTANT_MODE;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_MODEL;
    delete process.env.OPENROUTER_SITE_URL;
    delete process.env.OPENROUTER_APP_NAME;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("defaults to demo mode until openrouter credentials are configured", async () => {
    const headers = buildOpenRouterHeaders();

    expect(getConfiguredSupportMode()).toBe("demo");
    expect(hasOpenRouterCredentials()).toBe(false);
    expect(getSupportMode()).toBe("demo");
    expect(getOpenRouterModel()).toBe(defaultOpenRouterModel);
    expect(headers.Authorization).toBe("Bearer ");
    expect(headers["X-Title"]).toBe("Pulse Support AI");
    expect(headers["HTTP-Referer"]).toBeUndefined();

    const reply = await generateSupportReply([billingMessage]);

    expect(reply).toEqual(fallbackReply);
  });

  it("builds openrouter headers and payload from the environment", () => {
    process.env.SUPPORT_ASSISTANT_MODE = "openrouter";
    process.env.OPENROUTER_API_KEY = "test-key";
    process.env.OPENROUTER_MODEL = "openrouter/free";
    process.env.OPENROUTER_SITE_URL = "https://example.com";
    process.env.OPENROUTER_APP_NAME = "Pulse Support AI Test";

    const headers = buildOpenRouterHeaders();
    const payload = buildOpenRouterPayload([], fallbackReply);

    expect(getConfiguredSupportMode()).toBe("openrouter");
    expect(hasOpenRouterCredentials()).toBe(true);
    expect(getSupportMode()).toBe("openrouter");
    expect(headers.Authorization).toBe("Bearer test-key");
    expect(headers["HTTP-Referer"]).toBe("https://example.com");
    expect(headers["X-Title"]).toBe("Pulse Support AI Test");
    expect(payload.model).toBe("openrouter/free");
    expect(payload.messages[1]?.content).toContain("(empty transcript)");
  });

  it("extracts and reads JSON content from openrouter responses", () => {
    expect(extractJsonObject("```json\n{\"message\":\"hello\"}\n```")).toBe("{\"message\":\"hello\"}");
    expect(extractJsonObject("no json here")).toBeNull();
    expect(readOpenRouterContent("plain text")).toBe("plain text");
    expect(
      readOpenRouterContent([{ text: "{\"message\":\"hello\"}" }, { text: "" }, {}]),
    ).toContain("{\"message\":\"hello\"}");
    expect(readOpenRouterContent([{ nope: true }])).toBeNull();
    expect(readOpenRouterContent(42)).toBeNull();
  });

  it("coerces valid and invalid openrouter payloads safely", () => {
    const openRouterReply = coerceSupportReply(JSON.parse(openRouterJsonReply), fallbackReply);
    const invalidReply = coerceSupportReply(
      {
        actions: ["Keep this", ""],
        references: [{}],
        confidence: Number.NaN,
      },
      fallbackReply,
    );
    const emptyCollectionsReply = coerceSupportReply(
      {
        actions: [],
        references: [],
      },
      fallbackReply,
    );

    expect(openRouterReply.mode).toBe("openrouter");
    expect(openRouterReply.confidence).toBe(1);
    expect(openRouterReply.sentiment).toBe("urgent");
    expect(openRouterReply.references[0]?.label).toBe("Payments Playbook");
    expect(invalidReply).toEqual({
      ...fallbackReply,
      mode: "openrouter",
    });
    expect(emptyCollectionsReply).toEqual({
      ...fallbackReply,
      mode: "openrouter",
    });
    expect(coerceSupportReply(null, fallbackReply)).toEqual(fallbackReply);
  });

  it("uses the free openrouter endpoint when configured", async () => {
    process.env.SUPPORT_ASSISTANT_MODE = "openrouter";
    process.env.OPENROUTER_API_KEY = "test-key";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: openRouterJsonReply,
            },
          },
        ],
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const reply = await generateSupportReply([billingMessage]);

    expect(fetchMock).toHaveBeenCalledWith(
      openRouterApiUrl,
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(reply.mode).toBe("openrouter");
    expect(reply.intent).toBe("billing");
    expect(reply.escalationTarget).toBe("finance");
  });

  it("falls back to the deterministic engine when openrouter fails", async () => {
    process.env.SUPPORT_ASSISTANT_MODE = "openrouter";
    process.env.OPENROUTER_API_KEY = "test-key";

    const firstFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: [{ text: "not json" }],
              },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {},
            },
          ],
        }),
      });

    vi.stubGlobal("fetch", firstFetch);

    const failedResponse = await generateSupportReply([billingMessage]);
    const invalidJsonResponse = await generateSupportReply([billingMessage]);
    const emptyContentResponse = await generateSupportReply([billingMessage]);

    expect(failedResponse).toEqual(fallbackReply);
    expect(invalidJsonResponse).toEqual(fallbackReply);
    expect(emptyContentResponse).toEqual(fallbackReply);
  });
});
