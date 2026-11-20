import { page } from "vitest/browser";
import { describe, it, beforeAll, afterAll, afterEach, expect } from "vitest";
import { Worker } from "../mocks/browser";
import { setupWebComponent } from "../mocks/web-component";

declare global {
  interface Window {
    __termsXss?: number;
  }
}

describe("Terms modal", () => {
  beforeAll(() => Worker.start({ quiet: true }));
  afterAll(() => Worker.stop());
  afterEach(() => {
    delete window.__termsXss;
  });

  it("should sanitize terms_html before rendering it", async () => {
    const widget = setupWebComponent({ "agent-id": "malicious_terms" });

    await page.getByRole("button", { name: "Start a call" }).click();
    await expect.element(page.getByText("Malicious terms")).toBeInTheDocument();

    const terms = widget.shadowRoot?.querySelector(".terms");
    expect(terms).toBeTruthy();
    expect(terms?.querySelector("script, svg")).toBeNull();
    expect(terms?.querySelector("[onerror], [onload]")).toBeNull();
    expect(terms?.innerHTML).not.toContain("onerror");
    expect(terms?.innerHTML).not.toContain("javascript:");

    const safeLink = terms?.querySelector<HTMLAnchorElement>(
      'a[href="https://example.com/terms"]'
    );
    expect(safeLink?.target).toBe("_blank");
    expect(safeLink?.rel).toBe("noopener noreferrer");
    expect(
      terms?.querySelectorAll("a[href]").length,
      "javascript: link must lose its href"
    ).toBe(1);

    await new Promise(resolve => setTimeout(resolve, 200));
    expect(window.__termsXss).toBeUndefined();
  });
});
