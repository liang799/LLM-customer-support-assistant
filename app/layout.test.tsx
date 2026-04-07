import { isValidElement } from "react";
import { describe, expect, it } from "vitest";

import RootLayout, { metadata } from "@/app/layout";

describe("RootLayout", () => {
  it("exports metadata and wraps children in the document shell", () => {
    const element = RootLayout({
      children: <div>Wrapped content</div>,
    });

    expect(metadata.title).toBe("Pulse Support AI");
    expect(metadata.description).toContain("customer support assistant");
    expect(isValidElement(element)).toBe(true);
    expect(element.props.lang).toBe("en");
    expect(element.props.children.type).toBe("body");
  });
});
