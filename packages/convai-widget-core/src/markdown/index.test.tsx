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

  describe("images", () => {
    const acme = { allowedHosts: ["acme.com"], includeWww: true, allowHttp: false };
    const dataPng =
      "data:image/png;base64,iVBORw0KGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

    const srcs = () =>
      Array.from(container.querySelectorAll("img"), img => img.getAttribute("src"));

    it("does not load images from hosts outside the link allowlist", () => {
      render(
        <WidgetStreamdown linkConfig={acme}>
          {"![x](https://evil.example/p?d=1) ![y](http://evil.example/q)"}
        </WidgetStreamdown>,
        container
      );
      expect(srcs()).toEqual([]);
      expect(container.innerHTML).not.toContain("evil.example");
      expect(container.textContent).toContain("[Image blocked: x]");
    });

    it("blocks raw HTML images from other hosts", () => {
      render(
        <WidgetStreamdown linkConfig={acme}>
          {'<img src="https://evil.example/p?d=1" alt="x">'}
        </WidgetStreamdown>,
        container
      );
      expect(srcs()).toEqual([]);
    });

    it("blocks look-alike hosts", () => {
      render(
        <WidgetStreamdown linkConfig={acme}>
          {"![x](https://acme.com.evil.example/p)"}
        </WidgetStreamdown>,
        container
      );
      expect(srcs()).toEqual([]);
    });

    it("renders images on allowed hosts, the page origin and data URLs", () => {
      render(
        <WidgetStreamdown linkConfig={acme}>
          {`![a](https://acme.com/logo.png) ![b](https://www.acme.com/b.png) ![c](${location.origin}/c.png) ![d](${dataPng})`}
        </WidgetStreamdown>,
        container
      );
      expect(srcs()).toEqual([
        "https://acme.com/logo.png",
        "https://www.acme.com/b.png",
        `${location.origin}/c.png`,
        dataPng,
      ]);
    });

    it("allows any image host when the owner allows any link host", () => {
      render(
        <WidgetStreamdown
          linkConfig={{ allowedHosts: ["*"], includeWww: false, allowHttp: false }}
        >
          {"![x](https://cdn.example.org/x.png)"}
        </WidgetStreamdown>,
        container
      );
      expect(srcs()).toEqual(["https://cdn.example.org/x.png"]);
    });
  });
});
