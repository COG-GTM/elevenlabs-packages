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

const HMAC_SECRET_ERROR =
  "[ConversationalAI] orchestrator-agent-config is public page markup, so it must not contain a webhook hmac_secret. Configure webhook signing secrets on the orchestrator server instead.";

function parseWebhook(
  value: unknown
): PostCallWebhookConfig | undefined | null {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (!isRecord(value) || typeof value.url !== "string" || !value.url) {
    console.error(
      "[ConversationalAI] orchestrator-agent-config webhooks need a string url"
    );
    return null;
  }
  if ("hmac_secret" in value) {
    // Any visitor can read the attribute, so a secret here could be used to
    // forge signed webhook deliveries. Refuse rather than silently dropping
    // it, which would disable signing without the integrator noticing.
    console.error(HMAC_SECRET_ERROR);
    return null;
  }
  return { url: value.url };
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
      parsed.post_call_transcription_webhook
    );
    const audioWebhook = parseWebhook(parsed.post_call_audio_webhook);
    if (transcriptionWebhook === null || audioWebhook === null) {
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
      postCallTranscriptionWebhook: transcriptionWebhook,
      postCallAudioWebhook: audioWebhook,
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
