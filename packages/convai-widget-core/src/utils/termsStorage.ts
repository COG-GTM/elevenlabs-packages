const STORAGE_KEY_PREFIX = "elevenlabs_convai_terms_";
const ACCEPTED_MARKER = "true";

// The widget shares localStorage with the host page, so the configured
// terms_key is namespaced to keep it from reading or overwriting host keys.
export function termsStorageKey(
  agentId: string | null | undefined,
  termsKey: string | null | undefined
): string | null {
  if (!termsKey) return null;
  return `${STORAGE_KEY_PREFIX}${agentId ?? ""}_${termsKey}`;
}

export function resolveAgentId(
  agentId: string | undefined,
  signedUrl: string | undefined
): string | undefined {
  if (signedUrl) {
    try {
      return new URL(signedUrl).searchParams.get("agent_id") ?? agentId;
    } catch {
      return agentId;
    }
  }
  return agentId;
}

export function readTermsAccepted(key: string | null): boolean {
  if (!key) return false;
  try {
    return localStorage.getItem(key) === ACCEPTED_MARKER;
  } catch {
    return false;
  }
}

export function storeTermsAccepted(key: string | null) {
  if (!key) return;
  try {
    localStorage.setItem(key, ACCEPTED_MARKER);
  } catch {
    // Storage may be unavailable (e.g. blocked third-party storage).
  }
}
