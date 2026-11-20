import type { Root } from "hast";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import type { ComponentProps, VNode } from "preact";
import { Fragment, jsx, jsxs } from "preact/jsx-runtime";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema, type Options } from "rehype-sanitize";
import { unified } from "unified";

const termsSchema: Options = {
  ...defaultSchema,
  protocols: {
    ...defaultSchema.protocols,
    href: ["https", "mailto"],
    src: ["https"],
  },
};

const processor = unified().use(rehypeRaw).use(rehypeSanitize, termsSchema);

function TermsLink(props: ComponentProps<"a">) {
  return <a {...props} target="_blank" rel="noopener noreferrer" />;
}

/**
 * Parses untrusted terms HTML from the agent config, strips scripts, event
 * handlers and unsafe URLs, and returns it as Preact elements so it never
 * reaches the DOM as raw HTML.
 */
export function renderTermsHtml(html: string): VNode {
  const tree: Root = {
    type: "root",
    children: [{ type: "raw", value: html }],
  };
  const sanitized = processor.runSync(tree) as Root;
  return toJsxRuntime(sanitized, {
    Fragment,
    jsx,
    jsxs,
    components: { a: TermsLink },
    ignoreInvalidStyle: true,
  }) as VNode;
}
