import { describe, it, expect, vi, afterEach } from "vitest";
import {
  assertOrchestratorWebhookSecretAllowed,
  constructEnclaveSetupConfig,
} from "./orchestrator.js";

describe("constructEnclaveSetupConfig", () => {
  it("maps unset fields to nulls", () => {
    expect(
      constructEnclaveSetupConfig({
        url: "ws://localhost:8000/sagemaker/convai/conversation",
      })
    ).toEqual({
      type: "enclave_setup_config",
      agent_config_dict: null,
      override_agent_config_list: null,
      tools_config_list: null,
      prompt_knowledge_base: null,
    });
  });

  it("maps all fields to the wire format", () => {
    expect(
      constructEnclaveSetupConfig({
        url: "ws://localhost:8000/sagemaker/convai/conversation",
        agentConfig: { name: "agent" },
        agentConfigOverrides: [{ language: "en" }],
        tools: [{ type: "webhook" }],
        promptKnowledgeBase: ["fact"],
        bedrockInferenceProfile: "global",
        postCallTranscriptionWebhook: {
          url: "https://example.com/transcript",
          hmacSecret: "0123456789abcdef",
        },
        postCallAudioWebhook: { url: "https://example.com/audio" },
        allowInsecureWebhookSecret: true,
      })
    ).toEqual({
      type: "enclave_setup_config",
      agent_config_dict: { name: "agent" },
      override_agent_config_list: [{ language: "en" }],
      tools_config_list: [{ type: "webhook" }],
      prompt_knowledge_base: ["fact"],
      bedrock_inference_profile: "global",
      post_call_transcription_webhook: {
        url: "https://example.com/transcript",
        hmac_secret: "0123456789abcdef",
      },
      post_call_audio_webhook: { url: "https://example.com/audio" },
    });
  });

  it("omits hmac_secret without allowInsecureWebhookSecret", () => {
    const event = constructEnclaveSetupConfig({
      url: "ws://localhost:8000/sagemaker/convai/conversation",
      postCallTranscriptionWebhook: {
        url: "https://example.com/transcript",
        hmacSecret: "0123456789abcdef",
      },
      postCallAudioWebhook: {
        url: "https://example.com/audio",
        hmacSecret: "0123456789abcdef",
      },
    });
    expect(event.post_call_transcription_webhook).toEqual({
      url: "https://example.com/transcript",
    });
    expect(event.post_call_audio_webhook).toEqual({
      url: "https://example.com/audio",
    });
    expect(JSON.stringify(event)).not.toContain("hmac_secret");
  });
});

describe("assertOrchestratorWebhookSecretAllowed", () => {
  const url = "ws://localhost:8000/sagemaker/convai/conversation";
  const webhook = {
    url: "https://example.com/transcript",
    hmacSecret: "0123456789abcdef",
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("accepts webhooks without a secret", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() =>
      assertOrchestratorWebhookSecretAllowed({
        url,
        postCallTranscriptionWebhook: { url: webhook.url },
      })
    ).not.toThrow();
    expect(warn).not.toHaveBeenCalled();
  });

  it.each(["postCallTranscriptionWebhook", "postCallAudioWebhook"] as const)(
    "rejects an hmacSecret on %s without the development flag",
    key => {
      expect(() =>
        assertOrchestratorWebhookSecretAllowed({ url, [key]: webhook })
      ).toThrow(/allowInsecureWebhookSecret/);
    }
  );

  it("warns when the development flag allows the secret", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() =>
      assertOrchestratorWebhookSecretAllowed({
        url,
        postCallAudioWebhook: webhook,
        allowInsecureWebhookSecret: true,
      })
    ).not.toThrow();
    expect(warn).toHaveBeenCalledOnce();
  });
});
