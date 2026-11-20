import type { Root } from "hast";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema, type Options } from "rehype-sanitize";
import { unified } from "unified";

const TERMS_SCHEMA: Options = {
  ...defaultSchema,
  protocols: {
    ...defaultSchema.protocols,
    href: ["https", "mailto"],
    src: ["https"],
  },
  attributes: {
    ...defaultSchema.attributes,
    a: [...(defaultSchema.attributes?.a ?? []), ["target", "_blank"]],
  },
};

const processor = unified().use(rehypeRaw).use(rehypeSanitize, TERMS_SCHEMA);

export function sanitizeTermsHtml(html: string): Root {
  const tree: Root = {
    type: "root",
    children: [{ type: "raw", value: html }],
  };
  return processor.runSync(tree) as Root;
}
