import { describe, it, expect, vi, afterEach } from "vitest";
import { parseOrchestratorConfig } from "./parseOrchestratorConfig";

describe("parseOrchestratorConfig", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a URL-only config when no agent config is given", () => {
    expect(parseOrchestratorConfig("wss://host/convai", undefined)).toEqual({
      url: "wss://host/convai",
    });
  });

  it("maps exported agent config keys to the client SDK shape", () => {
    expect(
      parseOrchestratorConfig(
        "wss://host/convai",
        JSON.stringify({
          agent_config_dict: { name: "agent" },
          tools_config_list: [{ type: "webhook" }],
          override_agent_config_list: [{ language: "en" }],
          prompt_knowledge_base: ["fact"],
          bedrock_inference_profile: "global",
          post_call_transcription_webhook: {
            url: "https://example.com/t",
          },
        })
      )
    ).toEqual({
      url: "wss://host/convai",
      agentConfig: { name: "agent" },
      tools: [{ type: "webhook" }],
      agentConfigOverrides: [{ language: "en" }],
      promptKnowledgeBase: ["fact"],
      bedrockInferenceProfile: "global",
      postCallTranscriptionWebhook: {
        url: "https://example.com/t",
      },
      postCallAudioWebhook: undefined,
    });
  });

  it("accepts the alternate export key names", () => {
    expect(
      parseOrchestratorConfig(
        "wss://host/convai",
        JSON.stringify({
          agent_config: { name: "agent" },
          tools_config: [{ type: "webhook" }],
          override_agent_config: [{ language: "en" }],
        })
      )
    ).toMatchObject({
      agentConfig: { name: "agent" },
      tools: [{ type: "webhook" }],
      agentConfigOverrides: [{ language: "en" }],
    });
  });

  it("returns null and logs on invalid JSON", () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    expect(
      parseOrchestratorConfig("wss://host/convai", "{not json")
    ).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it.each(["null", "123", '"text"', "[1,2]"])(
    "returns null and logs when the JSON is not an object (%s)",
    json => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      expect(parseOrchestratorConfig("wss://host/convai", json)).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();
    }
  );

  it("normalizes http(s) URLs to ws(s)", () => {
    expect(parseOrchestratorConfig("https://host/convai", undefined)).toEqual({
      url: "wss://host/convai",
    });
    expect(
      parseOrchestratorConfig("http://localhost:8000/convai", undefined)
    ).toEqual({ url: "ws://localhost:8000/convai" });
  });

  it("drops a non-string bedrock_inference_profile", () => {
    expect(
      parseOrchestratorConfig(
        "wss://host/convai",
        JSON.stringify({ bedrock_inference_profile: { region: "eu" } })
      )
    ).toMatchObject({ bedrockInferenceProfile: undefined });
  });

  it("drops wrongly shaped agent config fields", () => {
    expect(
      parseOrchestratorConfig(
        "wss://host/convai",
        JSON.stringify({
          agent_config_dict: "not an object",
          tools_config_list: [{ type: "webhook" }, "not an object"],
          override_agent_config_list: {},
          prompt_knowledge_base: ["fact", 42],
        })
      )
    ).toEqual({
      url: "wss://host/convai",
      agentConfig: undefined,
      agentConfigOverrides: undefined,
      tools: undefined,
      promptKnowledgeBase: undefined,
      bedrockInferenceProfile: undefined,
      postCallTranscriptionWebhook: undefined,
      postCallAudioWebhook: undefined,
    });
  });

  it.each([
    { post_call_transcription_webhook: { url: 123 } },
    {
      post_call_audio_webhook: {
        url: "https://example.com/a",
        hmac_secret: 42,
      },
    },
  ])("returns null and logs on an invalid webhook (%j)", config => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    expect(
      parseOrchestratorConfig("wss://host/convai", JSON.stringify(config))
    ).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it.each(["post_call_transcription_webhook", "post_call_audio_webhook"])(
    "rejects an hmac_secret in %s because the page attribute is public",
    key => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const result = parseOrchestratorConfig(
        "wss://host/convai",
        JSON.stringify({
          [key]: {
            url: "https://example.com/hook",
            hmac_secret: "0123456789abcdef",
          },
        })
      );
      expect(result).toBeNull();
      expect(JSON.stringify(result)).not.toContain("0123456789abcdef");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(`${key}.hmac_secret is not allowed`)
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Configure webhook signing on the orchestrator")
      );
    }
  );

  it.each([null, "", 0])(
    "rejects an hmac_secret key whatever its value (%j)",
    secret => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      expect(
        parseOrchestratorConfig(
          "wss://host/convai",
          JSON.stringify({
            post_call_audio_webhook: {
              url: "https://example.com/a",
              hmac_secret: secret,
            },
          })
        )
      ).toBeNull();
    }
  );
});
