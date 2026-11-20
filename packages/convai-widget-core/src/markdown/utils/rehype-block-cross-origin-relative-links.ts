import type { Element, ElementContent, Root, RootContent } from "hast";

function isAbsoluteUrl(href: string): boolean {
  try {
    new URL(href);
    return true;
  } catch {
    return false;
  }
}

function resolvesToOrigin(href: string, origin: string): boolean {
  try {
    return new URL(href, origin).origin === new URL(origin).origin;
  } catch {
    return false;
  }
}

function blockedLink(node: Element): Element {
  return {
    type: "element",
    tagName: "span",
    properties: {
      title: "Blocked URL: " + String(node.properties.href),
      class: "text-gray-500",
    },
    children: [...node.children, { type: "text", value: " [blocked]" }],
  };
}

function visitChildren(
  children: (RootContent | ElementContent)[],
  origin: string
) {
  for (let i = 0; i < children.length; i += 1) {
    const child = children[i];
    if (child.type !== "element") continue;
    visitChildren(child.children, origin);
    const href = child.properties.href;
    if (
      child.tagName === "a" &&
      typeof href === "string" &&
      !isAbsoluteUrl(href) &&
      !resolvesToOrigin(href, origin)
    ) {
      children[i] = blockedLink(child);
    }
  }
}

/**
 * rehype-harden validates relative links against `defaultOrigin` but writes
 * back only the path, so `/.//evil.example` becomes `//evil.example`, which
 * the browser treats as another host. Block any relative href that no longer
 * resolves to the origin it was validated against.
 */
export function rehypeBlockCrossOriginRelativeLinks({
  defaultOrigin,
}: {
  defaultOrigin: string;
}) {
  return (tree: Root) => {
    visitChildren(tree.children, defaultOrigin);
  };
}
