import type { Root } from "hast";
import type { Options as Schema } from "rehype-sanitize";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import { useMemo } from "preact/hooks";
import { Fragment, jsx, jsxs } from "preact/jsx-runtime";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { unified } from "unified";
import { useTextContents } from "../contexts/text-contents";
import { useLocalizedTerms } from "../contexts/widget-config";
import { useTerms } from "../contexts/terms";
import { Button } from "../components/Button";

const TERMS_SCHEMA: Schema = {
  tagNames: [
    "a",
    "b",
    "blockquote",
    "br",
    "div",
    "em",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "i",
    "li",
    "ol",
    "p",
    "s",
    "small",
    "span",
    "strong",
    "sub",
    "sup",
    "u",
    "ul",
  ],
  attributes: {
    a: ["href", "title", ["target", "_blank"]],
  },
  protocols: {
    href: ["http", "https", "mailto"],
  },
  strip: ["script", "style"],
};

const termsProcessor = unified()
  .use(rehypeRaw)
  .use(rehypeSanitize, TERMS_SCHEMA);

function renderTermsHtml(html: string) {
  const tree: Root = {
    type: "root",
    children: [{ type: "raw", value: html }],
  };
  const sanitized = termsProcessor.runSync(tree) as Root;
  return toJsxRuntime(sanitized, { Fragment, jsx, jsxs });
}

export function TermsModal() {
  const text = useTextContents();
  const localizedTerms = useLocalizedTerms();
  const { dismissTerms, acceptTerms } = useTerms();
  const termsHtml = localizedTerms.value.terms_html ?? "";
  const terms = useMemo(() => renderTermsHtml(termsHtml), [termsHtml]);

  return (
    <div className="max-w-[400px] flex flex-col gap-2 bg-base shadow-md pointer-events-auto rounded-sheet p-3 text-sm">
      <div className="flex flex-col gap-1 terms p-2 pt-1">{terms}</div>
      <div className="flex justify-end gap-2">
        <Button onClick={dismissTerms}>{text.dismiss_terms}</Button>
        <Button onClick={acceptTerms} variant="primary">
          {text.accept_terms}
        </Button>
      </div>
    </div>
  );
}
