import { describe, expect, it } from "vitest";

import { escalationTargets, sentiments, supportIntents, supportModes } from "@/lib/support-types";

describe("support type constants", () => {
  it("exports the supported intents, sentiments, and escalation targets", () => {
    expect(supportIntents).toContain("billing");
    expect(supportIntents).toContain("unknown");
    expect(sentiments).toEqual(["calm", "frustrated", "urgent"]);
    expect(escalationTargets).toContain("priority-desk");
    expect(supportModes).toEqual(["demo", "openrouter"]);
  });
});
