export function safeHttpUrl(
  url: string | null | undefined
): string | undefined {
  if (!url) {
    return undefined;
  }
  try {
    const { protocol } = new URL(url);
    return protocol === "https:" || protocol === "http:" ? url : undefined;
  } catch {
    return undefined;
  }
}
