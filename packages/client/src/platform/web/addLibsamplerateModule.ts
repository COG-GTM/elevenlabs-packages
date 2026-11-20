import { addWorkletModule } from "./createWorkletModuleLoader.js";

export const LIBSAMPLERATE_URL =
  "https://cdn.jsdelivr.net/npm/@alexanderolsen/libsamplerate-js@2.1.2/dist/libsamplerate.worklet.js";
/** SHA-256 of dist/libsamplerate.worklet.js in the @alexanderolsen/libsamplerate-js@2.1.2 npm tarball. */
export const LIBSAMPLERATE_SHA256 =
  "ca6e162f194d3ee5a2d2cd3c3b49641d31e56845aeae507feca1cdf8aa8116cb";

const verifiedSources = new Map<string, Promise<string>>();

async function sha256Hex(data: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), byte =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

async function fetchVerifiedSource(url: string, expectedSha256: string) {
  const response = await fetch(url, { credentials: "omit" });
  if (!response.ok) {
    throw new Error(
      `Failed to download libsamplerate from ${url}: HTTP ${response.status}`
    );
  }
  const body = await response.arrayBuffer();
  const actualSha256 = await sha256Hex(body);
  if (actualSha256 !== expectedSha256) {
    throw new Error(
      `Refusing to load libsamplerate from ${url}: SHA-256 ${actualSha256} does not match the pinned ${expectedSha256}. ` +
        `Self-host the file and pass libsampleratePath to avoid depending on the CDN.`
    );
  }
  return new TextDecoder().decode(body);
}

/** Loads a remote worklet only if its content matches the pinned SHA-256, from a local blob:/data: URL. */
export async function addVerifiedModule(
  context: BaseAudioContext,
  url: string,
  expectedSha256: string
) {
  const key = `${url} ${expectedSha256}`;
  let source = verifiedSources.get(key);
  if (!source) {
    source = fetchVerifiedSource(url, expectedSha256);
    verifiedSources.set(key, source);
    source.catch(() => verifiedSources.delete(key));
  }
  await addWorkletModule({
    worklet: context.audioWorklet,
    name: "libsamplerate",
    key: `libsamplerate@${expectedSha256}`,
    sourceCode: await source,
  });
}

export async function addLibsamplerateModule(
  context: AudioContext,
  customPath?: string
) {
  if (customPath) {
    await context.audioWorklet.addModule(customPath);
    return;
  }
  await addVerifiedModule(context, LIBSAMPLERATE_URL, LIBSAMPLERATE_SHA256);
}
