import type { Root } from "hast";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import type { ComponentChildren } from "preact";
import { Fragment, jsx, jsxs } from "preact/jsx-runtime";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, {
  type Options as SanitizeSchema,
} from "rehype-sanitize";
import { unified } from "unified";

const HEADINGS = ["h1", "h2", "h3", "h4", "h5", "h6"];

export const TERMS_SANITIZE_SCHEMA: SanitizeSchema = {
  strip: ["script", "style", "template", "noscript"],
  clobberPrefix: "user-content-",
  clobber: ["id", "name"],
  tagNames: [
    "p",
    "br",
    "hr",
    "div",
    "span",
    ...HEADINGS,
    "ul",
    "ol",
    "li",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "del",
    "small",
    "sub",
    "sup",
    "blockquote",
    "code",
    "a",
  ],
  attributes: {
    a: ["href", "title", ["target", "_blank"]],
    ol: ["start"],
  },
  required: {
    a: { rel: "noopener noreferrer" },
  },
  protocols: {
    href: ["http", "https", "mailto"],
  },
};

const processor = unified()
  .use(rehypeRaw)
  .use(rehypeSanitize, TERMS_SANITIZE_SCHEMA);

export function sanitizeTermsHtml(html: string): Root {
  const tree: Root = {
    type: "root",
    children: [{ type: "raw", value: html }],
  };
  return processor.runSync(tree) as Root;
}

export function renderTermsHtml(
  html: string | null | undefined
): ComponentChildren {
  if (!html) {
    return null;
  }
  return toJsxRuntime(sanitizeTermsHtml(html), {
    Fragment,
    jsx,
    jsxs,
    passKeys: true,
  }) as ComponentChildren;
}
