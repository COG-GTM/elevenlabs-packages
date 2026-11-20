import { page } from "vitest/browser";
import { describe, it, beforeAll, afterAll, afterEach, expect } from "vitest";
import { Worker } from "../mocks/browser";
import { AGENTS } from "../mocks/browser";
import { setupWebComponent } from "../mocks/web-component";

declare global {
  interface Window {
    __termsXss?: number;
  }
}

async function openTerms(element: HTMLElement) {
  await page.getByRole("button", { name: "Start a call" }).click();
  await expect.element(page.getByText("Malicious terms")).toBeInTheDocument();
  const terms = element.shadowRoot?.querySelector(".terms");
  expect(terms).not.toBeNull();
  return terms!;
}

function expectSanitized(terms: Element) {
  expect(window.__termsXss).toBeUndefined();
  expect(terms.querySelector("script, style, iframe")).toBeNull();
  expect(terms.querySelector("[onerror], [onclick]")).toBeNull();
  const img = terms.querySelector("img");
  expect(img?.hasAttribute("onerror") ?? false).toBe(false);

  const jsLink = Array.from(terms.querySelectorAll("a")).find(
    a => a.textContent === "JS link"
  );
  expect(jsLink?.getAttribute("href") ?? null).toBeNull();

  const link = Array.from(terms.querySelectorAll("a")).find(
    a => a.textContent === "Full terms"
  );
  expect(link?.getAttribute("href")).toBe("https://example.com/terms");
  expect(link?.getAttribute("target")).toBe("_blank");
}

describe("Terms HTML sanitization", () => {
  beforeAll(() => Worker.start({ quiet: true }));
  afterAll(() => Worker.stop());
  afterEach(() => {
    delete window.__termsXss;
  });

  it("strips script-capable markup from fetched terms_html", async () => {
    const element = setupWebComponent({ "agent-id": "terms_xss" });
    const terms = await openTerms(element);
    await new Promise(resolve => setTimeout(resolve, 200));
    expectSanitized(terms);
  });

  it("strips script-capable markup from override-config terms_html", async () => {
    const element = setupWebComponent({
      "agent-id": "basic",
      "override-config": JSON.stringify(AGENTS.terms_xss),
    });
    const terms = await openTerms(element);
    await new Promise(resolve => setTimeout(resolve, 200));
    expectSanitized(terms);
  });
});
