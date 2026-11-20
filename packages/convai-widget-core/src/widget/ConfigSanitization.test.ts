import { page } from "vitest/browser";
import { describe, it, beforeAll, afterAll, afterEach, expect } from "vitest";
import { Worker } from "../mocks/browser";
import { AGENTS } from "../mocks/browser";
import { setupWebComponent } from "../mocks/web-component";
import { safeHttpUrl } from "../utils/safeHttpUrl";

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
  // Give any injected handlers (e.g. img onerror) a chance to fire
  await new Promise(resolve => setTimeout(resolve, 200));
  return terms!;
}

function expectSanitized(terms: Element) {
  expect(window.__termsXss).toBeUndefined();
  expect(terms.querySelector("script, style, iframe")).toBeNull();
  for (const el of Array.from(terms.querySelectorAll("*"))) {
    for (const attr of Array.from(el.attributes)) {
      expect(attr.name.startsWith("on")).toBe(false);
    }
  }

  const links = Array.from(terms.querySelectorAll("a"));
  for (const a of links) {
    expect(a.getAttribute("href") ?? "").not.toMatch(/^\s*javascript:/i);
  }
  const link = links.find(a => a.textContent === "Full terms");
  expect(link?.getAttribute("href")).toBe("https://example.com/terms");
  expect(link?.getAttribute("target")).toBe("_blank");
}

async function poweredByLink(element: HTMLElement) {
  await expect.element(page.getByText("ElevenAgents")).toBeInTheDocument();
  const link = Array.from(element.shadowRoot?.querySelectorAll("a") ?? []).find(
    a => a.textContent === "ElevenAgents"
  );
  expect(link).toBeDefined();
  return link!;
}

describe("widget config sanitization", () => {
  beforeAll(() => Worker.start({ quiet: true }));
  afterAll(() => Worker.stop());
  afterEach(() => {
    delete window.__termsXss;
  });

  it("strips script-capable markup from fetched terms_html", async () => {
    const element = setupWebComponent({ "agent-id": "terms_xss" });
    expectSanitized(await openTerms(element));
  });

  it("strips script-capable markup from override-config terms_html", async () => {
    const element = setupWebComponent({
      "agent-id": "basic",
      "override-config": JSON.stringify(AGENTS.terms_xss),
    });
    expectSanitized(await openTerms(element));
  });

  it("strips script-capable markup from language preset terms_html", async () => {
    const element = setupWebComponent({
      "agent-id": "terms_xss_language_preset",
    });
    expectSanitized(await openTerms(element));
  });

  it("keeps benign terms markup", async () => {
    const element = setupWebComponent({ "agent-id": "basic" });
    await page.getByRole("button", { name: "Start a call" }).click();
    await expect.element(page.getByText("Test terms")).toBeInTheDocument();
  });

  it("falls back to the default Powered-by link for javascript: override_link", async () => {
    const element = setupWebComponent({ "agent-id": "powered_by_js_link" });
    const link = await poweredByLink(element);
    expect(link.getAttribute("href")).toBe("https://elevenlabs.io/agents");
  });

  it("falls back for javascript: override_link from override-config", async () => {
    const element = setupWebComponent({
      "agent-id": "basic",
      "override-config": JSON.stringify(AGENTS.powered_by_js_link),
    });
    const link = await poweredByLink(element);
    expect(link.getAttribute("href")).toBe("https://elevenlabs.io/agents");
  });

  it("keeps an https override_link", async () => {
    const element = setupWebComponent({ "agent-id": "powered_by_custom_link" });
    const link = await poweredByLink(element);
    expect(link.getAttribute("href")).toBe("https://example.com/agents");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });
});

describe("safeHttpUrl", () => {
  it.each([
    ["https://example.com/a", "https://example.com/a"],
    ["http://example.com", "http://example.com"],
    ["javascript:alert(1)", undefined],
    [" JavaScript:alert(1)", undefined],
    ["java\tscript:alert(1)", undefined],
    ["data:text/html,<script>alert(1)</script>", undefined],
    ["vbscript:msgbox(1)", undefined],
    ["/relative", undefined],
    ["", undefined],
    [undefined, undefined],
  ])("%j -> %j", (input, expected) => {
    expect(safeHttpUrl(input)).toBe(expected);
  });
});
