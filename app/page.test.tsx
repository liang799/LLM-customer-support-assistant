import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import HomePage from "@/app/page";
import * as supportRuntime from "@/lib/support-runtime";

describe("HomePage", () => {
  it("renders the support dashboard entry point", () => {
    vi.spyOn(supportRuntime, "getSupportMode").mockReturnValue("openrouter");

    render(<HomePage />);

    expect(screen.getByText("Support desk copilot")).toBeInTheDocument();
    expect(screen.getByText("Mode: OpenRouter free")).toBeInTheDocument();
  });
});
