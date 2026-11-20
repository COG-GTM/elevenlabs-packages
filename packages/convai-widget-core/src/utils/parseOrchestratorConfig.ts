import type {
  OrchestratorConfig,
  PostCallWebhookConfig,
} from "@elevenlabs/client";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

function asRecordList(value: unknown): Record<string, unknown>[] | undefined {
  return Array.isArray(value) && value.every(isRecord) ? value : undefined;
}

function asStringList(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every(item => typeof item === "string")
    ? value
    : undefined;
}

type WebhookParseResult =
  | { webhook: PostCallWebhookConfig | undefined }
  | { error: string };

function parseWebhook(key: string, value: unknown): WebhookParseResult {
  if (value === undefined || value === null) {
    return { webhook: undefined };
  }
  if (!isRecord(value) || typeof value.url !== "string" || !value.url) {
    return { error: `${key} needs a string url` };
  }
  if ("hmac_secret" in value) {
    return {
      error: `${key}.hmac_secret is not allowed: the page is public, so anyone can read it and sign forged deliveries. Configure webhook signing on the orchestrator instead.`,
    };
  }
  return { webhook: { url: value.url } };
}

export function parseOrchestratorConfig(
  rawUrl: string,
  agentConfigJSON: string | undefined
): OrchestratorConfig | null {
  const url = rawUrl
    .replace(/^https:\/\//, "wss://")
    .replace(/^http:\/\//, "ws://");

  if (!agentConfigJSON) {
    return { url };
  }

  try {
    const parsed = JSON.parse(agentConfigJSON);
    if (!isRecord(parsed)) {
      console.error(
        "[ConversationalAI] orchestrator-agent-config must be a JSON object"
      );
      return null;
    }
    const transcriptionWebhook = parseWebhook(
      "post_call_transcription_webhook",
      parsed.post_call_transcription_webhook
    );
    const audioWebhook = parseWebhook(
      "post_call_audio_webhook",
      parsed.post_call_audio_webhook
    );
    if ("error" in transcriptionWebhook || "error" in audioWebhook) {
      const error =
        "error" in transcriptionWebhook
          ? transcriptionWebhook.error
          : (audioWebhook as { error: string }).error;
      console.error(`[ConversationalAI] orchestrator-agent-config ${error}`);
      return null;
    }
    return {
      url,
      agentConfig:
        asRecord(parsed.agent_config_dict) ?? asRecord(parsed.agent_config),
      agentConfigOverrides:
        asRecordList(parsed.override_agent_config_list) ??
        asRecordList(parsed.override_agent_config),
      tools:
        asRecordList(parsed.tools_config_list) ??
        asRecordList(parsed.tools_config),
      promptKnowledgeBase: asStringList(parsed.prompt_knowledge_base),
      bedrockInferenceProfile:
        typeof parsed.bedrock_inference_profile === "string"
          ? parsed.bedrock_inference_profile
          : undefined,
      postCallTranscriptionWebhook: transcriptionWebhook.webhook,
      postCallAudioWebhook: audioWebhook.webhook,
    };
  } catch (error) {
    console.error(
      `[ConversationalAI] Cannot parse orchestrator-agent-config: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return null;
  }
}
