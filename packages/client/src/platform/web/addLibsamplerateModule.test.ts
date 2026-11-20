import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addLibsamplerateModule,
  addVerifiedModule,
  LIBSAMPLERATE_URL,
} from "./addLibsamplerateModule.js";

function fakeContext() {
  const addModule = vi.fn<(url: string) => Promise<void>>(async () => {});
  return {
    context: { audioWorklet: { addModule } } as unknown as AudioContext,
    addModule,
  };
}

async function sha256Hex(text: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  );
  return Array.from(new Uint8Array(digest), byte =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

function serve(body: string, status = 200) {
  const fetchMock = vi.fn(async () => new Response(body, { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("addLibsamplerateModule", () => {
  it("refuses to run a tampered CDN script", async () => {
    const fetchMock = serve("globalThis.LibSampleRate = { create: evil };");
    const { context, addModule } = fakeContext();

    await expect(addLibsamplerateModule(context)).rejects.toThrow(
      /does not match the pinned/
    );
    expect(fetchMock).toHaveBeenCalledWith(LIBSAMPLERATE_URL, {
      credentials: "omit",
    });
    expect(addModule).not.toHaveBeenCalled();
  });

  it("never hands a remote URL to addModule by default", async () => {
    serve("tampered");
    const { context, addModule } = fakeContext();

    await addLibsamplerateModule(context).catch(() => {});

    for (const [url] of addModule.mock.calls) {
      expect(url).toMatch(/^(blob|data):/);
    }
  });

  it("loads a custom path as-is without contacting the CDN", async () => {
    const fetchMock = serve("");
    const { context, addModule } = fakeContext();

    await addLibsamplerateModule(context, "/vendor/libsamplerate.js");

    expect(addModule).toHaveBeenCalledWith("/vendor/libsamplerate.js");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("addVerifiedModule", () => {
  const URL_ = "https://cdn.example/lib.js";

  it("loads matching content from a local URL", async () => {
    const source = "globalThis.LibSampleRate = {};";
    serve(source);
    const { context, addModule } = fakeContext();

    await addVerifiedModule(context, URL_, await sha256Hex(source));

    expect(addModule).toHaveBeenCalledTimes(1);
    expect(addModule.mock.calls[0][0]).toMatch(/^blob:/);
  });

  it("rejects an HTTP error without loading anything", async () => {
    serve("not found", 404);
    const { context, addModule } = fakeContext();

    await expect(
      addVerifiedModule(context, `${URL_}?404`, await sha256Hex("x"))
    ).rejects.toThrow("HTTP 404");
    expect(addModule).not.toHaveBeenCalled();
  });

  it("retries the download after a failed verification", async () => {
    const source = "globalThis.LibSampleRate = { retried: true };";
    const hash = await sha256Hex(source);
    const url = `${URL_}?retry`;
    const { context, addModule } = fakeContext();

    serve("tampered");
    await expect(addVerifiedModule(context, url, hash)).rejects.toThrow();

    const fetchMock = serve(source);
    await addVerifiedModule(context, url, hash);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(addModule).toHaveBeenCalledTimes(1);
  });
});
