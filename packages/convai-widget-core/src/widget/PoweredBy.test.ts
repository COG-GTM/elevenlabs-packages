import { page } from "vitest/browser";
import { describe, it, beforeAll, expect, afterAll } from "vitest";
import { Worker } from "../mocks/browser";
import { setupWebComponent } from "../mocks/web-component";

const DEFAULT_LINK = "https://elevenlabs.io/agents";

describe("Powered by link", () => {
  beforeAll(() => Worker.start({ quiet: true }));
  afterAll(() => Worker.stop());

  it("uses the default link with rel noopener noreferrer", async () => {
    setupWebComponent({ "agent-id": "basic", variant: "full" });

    const link = page.getByRole("link", { name: "ElevenAgents" });
    await expect.element(link).toHaveAttribute("href", DEFAULT_LINK);
    await expect.element(link).toHaveAttribute("target", "_blank");
    await expect.element(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("uses an https override_link", async () => {
    setupWebComponent({ "agent-id": "override_link_https", variant: "full" });

    const link = page.getByRole("link", { name: "ElevenAgents" });
    await expect
      .element(link)
      .toHaveAttribute("href", "https://example.com/custom");
    await expect.element(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it.each([
    "override_link_javascript",
    "override_link_http",
    "override_link_invalid",
  ] as const)("falls back to the default link for %s", async agentId => {
    setupWebComponent({ "agent-id": agentId, variant: "full" });

    const link = page.getByRole("link", { name: "ElevenAgents" });
    await expect.element(link).toHaveAttribute("href", DEFAULT_LINK);
    await expect.element(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
