import { describe, it, expect, vi, afterEach } from "vitest";
import { parseOrchestratorConfig } from "./parseOrchestratorConfig";

describe("parseOrchestratorConfig webhook signing secrets", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(["post_call_transcription_webhook", "post_call_audio_webhook"])(
    "refuses a browser-supplied hmac_secret on %s",
    key => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const config = parseOrchestratorConfig(
        "wss://host/convai",
        JSON.stringify({
          [key]: {
            url: "https://example.com/hook",
            hmac_secret: "0123456789abcdef",
          },
        })
      );
      expect(config).toBeNull();
      expect(JSON.stringify(config)).not.toContain("0123456789abcdef");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("hmac_secret")
      );
    }
  );

  it("never forwards hmacSecret to the client SDK, whatever the shape", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    for (const hmac_secret of ["0123456789abcdef", "", 42, null, {}]) {
      const config = parseOrchestratorConfig(
        "wss://host/convai",
        JSON.stringify({
          post_call_transcription_webhook: {
            url: "https://example.com/t",
            hmac_secret,
          },
          post_call_audio_webhook: { url: "https://example.com/a" },
        })
      );
      expect(JSON.stringify(config ?? {})).not.toMatch(/hmac/i);
    }
  });

  it("still forwards webhook URLs without a secret", () => {
    const config = parseOrchestratorConfig(
      "wss://host/convai",
      JSON.stringify({
        post_call_transcription_webhook: { url: "https://example.com/t" },
      })
    );
    expect(config?.postCallTranscriptionWebhook).toEqual({
      url: "https://example.com/t",
    });
  });
});
