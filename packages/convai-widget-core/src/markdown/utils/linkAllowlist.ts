import type { MarkdownLinkConfig } from "../../contexts/widget-config";
import { allowedDomainsToLinkPrefixes } from "./allowedDomainsToLinkPrefixes";

export function getDefaultOrigin(): string {
  const isInIframe = window.location !== window.parent.location;

  if (isInIframe) {
    // Prefer ancestorOrigins (more reliable), fall back to referrer
    // Firefox do not support https://caniuse.com/#search=ancestorOrigins
    const { ancestorOrigins } = document.location;
    if (ancestorOrigins && ancestorOrigins.length) {
      return ancestorOrigins[0];
    }
    if (document.referrer) {
      try {
        return new URL(document.referrer).origin;
      } catch {
        // Fall through to current origin
      }
    }
  }

  return document.location.origin;
}

export function getAllowedLinkPrefixes(
  linkConfig: MarkdownLinkConfig,
  defaultOrigin: string = getDefaultOrigin()
): string[] {
  return [defaultOrigin, ...allowedDomainsToLinkPrefixes(linkConfig)];
}

/**
 * Mirrors the rehype-harden link check so links outside Markdown follow the
 * same allowlist: same origin as a prefix and starting with it, or "*".
 */
export function isLinkAllowed(
  link: string,
  allowedPrefixes: string[],
  defaultOrigin: string = getDefaultOrigin()
): boolean {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;

  return allowedPrefixes.some(prefix => {
    if (prefix === "*") return true;
    let parsedPrefix: URL;
    try {
      parsedPrefix = new URL(prefix, defaultOrigin);
    } catch {
      return false;
    }
    return (
      parsedPrefix.origin === url.origin &&
      url.href.startsWith(parsedPrefix.href)
    );
  });
}
