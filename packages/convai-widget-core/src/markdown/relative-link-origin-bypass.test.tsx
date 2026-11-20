import { render } from "preact";
import { afterEach, describe, expect, it } from "vitest";
import { WidgetStreamdown } from ".";

const noLinksConfig = {
  allowedHosts: [],
  includeWww: true,
  allowHttp: false,
};

const allowlistConfig = {
  allowedHosts: ["example.com"],
  includeWww: true,
  allowHttp: false,
};

const BYPASS_PAYLOADS = [
  "/.//evil.example/login",
  "/%2e//evil.example/login",
  "/a/..//evil.example/login",
  "..//evil.example/login",
  "./..//evil.example/login",
  "/.///evil.example/login",
  "/.//evil.example/login?next=1#frag",
];

function resolvedHosts(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll("a")).map(
    a => new URL(a.getAttribute("href") ?? "", document.baseURI).host
  );
}

describe("WidgetStreamdown relative link origin check", () => {
  const container = document.createElement("div");
  document.body.append(container);

  afterEach(() => render(null, container));

  for (const linkConfig of [noLinksConfig, allowlistConfig]) {
    const label = linkConfig.allowedHosts.length ? "allow-list" : "no hosts";

    it.each(BYPASS_PAYLOADS)(
      `does not render %s as a link to another host (${label})`,
      payload => {
        render(
          <WidgetStreamdown linkConfig={linkConfig}>
            {`[Verify your account](${payload})`}
          </WidgetStreamdown>,
          container
        );

        expect(resolvedHosts(container)).not.toContain("evil.example");
        for (const a of Array.from(container.querySelectorAll("a"))) {
          const href = a.getAttribute("href") ?? "";
          expect(href).not.toMatch(/^[\\/]{2}/);
        }
        expect(container.querySelector("a")).toBeNull();
        expect(container.textContent).toContain("Verify your account");
        expect(container.textContent).toContain("[blocked]");
      }
    );
  }

  it.each([
    '<a href="/./\\evil.example/login">Verify your account</a>',
    '<a href="/.//evil.example/login">Verify your account</a>',
  ])("blocks raw HTML link %s", html => {
    render(
      <WidgetStreamdown linkConfig={noLinksConfig}>{html}</WidgetStreamdown>,
      container
    );
    expect(resolvedHosts(container)).not.toContain("evil.example");
    expect(container.querySelector("a")).toBeNull();
    expect(container.textContent).toContain("[blocked]");
  });

  it("still renders ordinary relative links on the page origin", () => {
    for (const [input, expected] of [
      ["/relative", "/relative"],
      ["/docs/page?x=1#top", "/docs/page?x=1#top"],
      ["/a/../b", "/b"],
      ["./help", "/help"],
    ]) {
      render(
        <WidgetStreamdown linkConfig={noLinksConfig}>
          {`[Relative link](${input})`}
        </WidgetStreamdown>,
        container
      );
      const a = container.querySelector("a");
      expect(a?.getAttribute("href")).toBe(expected);
      expect(new URL(a!.href).origin).toBe(document.location.origin);
    }
  });

  it("still blocks external absolute links when no hosts are allowed", () => {
    render(
      <WidgetStreamdown linkConfig={noLinksConfig}>
        [Link text](https://example.com/allowed)
      </WidgetStreamdown>,
      container
    );
    expect(container.querySelector("a")).toBeNull();
    expect(container.textContent).toContain("[blocked]");
  });

  it("still renders allow-listed absolute links", () => {
    render(
      <WidgetStreamdown linkConfig={allowlistConfig}>
        [Allowed](https://example.com/allowed)
      </WidgetStreamdown>,
      container
    );
    expect(container.querySelector("a")?.getAttribute("href")).toBe(
      "https://example.com/allowed"
    );
  });
});
