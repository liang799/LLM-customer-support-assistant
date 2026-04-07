import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "@/app/page";

describe("HomePage", () => {
  it("renders the support dashboard entry point", () => {
    render(<HomePage />);

    expect(screen.getByText("Support desk copilot")).toBeInTheDocument();
  });
});
