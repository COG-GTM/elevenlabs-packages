import { render } from "preact";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WidgetStreamdown } from ".";

vi.mock("../contexts/text-contents", () => ({
  useTextContents: () => ({ download: { value: "Download" } }),
}));

const linkConfig = {
  allowedHosts: ["example.com"],
  includeWww: true,
  allowHttp: false,
};

describe("WidgetStreamdown", () => {
  const container = document.createElement("div");
  document.body.append(container);

  afterEach(() => render(null, container));

  it("shows the text of a partially streamed link instead of [blocked]", () => {
    for (const partial of [
      "See [docs](https://example.com/pa",
      "See [do",
      "See [https://other.com/page](https://other.com/pa",
      "See [https://exa",
      "See [www.example.com](https://www.exa",
      "See [me@example.com](mailto:me@exa",
    ]) {
      render(
        <WidgetStreamdown linkConfig={linkConfig}>{partial}</WidgetStreamdown>,
        container
      );
      expect(container.textContent).not.toContain("[blocked]");
      expect(container.querySelector("a")).toBeNull();
    }

    render(
      <WidgetStreamdown linkConfig={linkConfig}>
        See [docs](https://example.com/page)
      </WidgetStreamdown>,
      container
    );
    expect(container.querySelector("a")?.getAttribute("href")).toBe(
      "https://example.com/page"
    );
  });

  it("blocks images from hosts outside the link allowlist", () => {
    render(
      <WidgetStreamdown linkConfig={linkConfig}>
        {"![x](https://evil.example/a.png?d=secret)"}
      </WidgetStreamdown>,
      container
    );
    expect(
      container.querySelector('img[src^="https://evil.example"]')
    ).toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });

  it("renders images from allowlisted hosts", () => {
    render(
      <WidgetStreamdown linkConfig={linkConfig}>
        {"![x](https://example.com/a.png)"}
      </WidgetStreamdown>,
      container
    );
    expect(container.querySelector("img")?.getAttribute("src")).toBe(
      "https://example.com/a.png"
    );
  });

  it("blocks all remote images when no hosts are allowlisted", () => {
    render(
      <WidgetStreamdown
        linkConfig={{ allowedHosts: [], includeWww: true, allowHttp: true }}
      >
        {"![x](https://example.com/a.png)"}
      </WidgetStreamdown>,
      container
    );
    expect(container.querySelector("img")).toBeNull();
  });
});
