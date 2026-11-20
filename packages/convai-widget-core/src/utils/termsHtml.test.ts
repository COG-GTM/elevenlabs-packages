import { render } from "preact";
import { describe, expect, it } from "vitest";

import { renderTermsHtml } from "./termsHtml";

const clean = (html: string) => {
  const container = document.createElement("div");
  render(renderTermsHtml(html), container);
  return container.innerHTML;
};

describe("sanitizeTermsHtml", () => {
  it("keeps basic formatting markup", () => {
    expect(
      clean(
        "<h2>Terms</h2><p>By <strong>continuing</strong> you <em>agree</em>.</p><ul><li>One</li></ul><br>"
      )
    ).toBe(
      "<h2>Terms</h2><p>By <strong>continuing</strong> you <em>agree</em>.</p><ul><li>One</li></ul><br>"
    );
  });

  it("keeps http(s) and mailto links and adds a safe rel", () => {
    expect(
      clean(
        '<a href="https://elevenlabs.io/terms" target="_blank">T</a><a href="mailto:a@b.c">M</a>'
      )
    ).toBe(
      '<a href="https://elevenlabs.io/terms" target="_blank" rel="noopener noreferrer">T</a><a href="mailto:a@b.c" rel="noopener noreferrer">M</a>'
    );
  });

  it.each([
    ['<img src=x onerror="alert(1)">', ""],
    ["<script>alert(1)</script>", ""],
    [
      '<a href="javascript:alert(1)">x</a>',
      '<a rel="noopener noreferrer">x</a>',
    ],
    [
      '<a href="data:text/html,<script>alert(1)</script>">x</a>',
      '<a rel="noopener noreferrer">x</a>',
    ],
    ['<p onclick="alert(1)" style="color:red">x</p>', "<p>x</p>"],
    ['<svg><animate onbegin="alert(1)"></animate></svg>', ""],
    ['<iframe srcdoc="<script>alert(1)</script>"></iframe>', ""],
    ['<form action="https://evil"><input name="pw"></form>', ""],
    [
      '<a href="https://x" target="_top">x</a>',
      '<a href="https://x" rel="noopener noreferrer">x</a>',
    ],
  ])("strips dangerous markup from %s", (input, expected) => {
    expect(clean(input)).toBe(expected);
  });
});
