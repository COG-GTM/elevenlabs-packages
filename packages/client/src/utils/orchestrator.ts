import type {
  OrchestratorConfig,
  PostCallWebhookConfig,
} from "./BaseConnection.js";

export const ENCLAVE_SETUP_CONFIG_TYPE = "enclave_setup_config";

export type EnclaveSetupConfigEvent = {
  type: typeof ENCLAVE_SETUP_CONFIG_TYPE;
  agent_config_dict: Record<string, unknown> | null;
  override_agent_config_list: Record<string, unknown>[] | null;
  tools_config_list: Record<string, unknown>[] | null;
  prompt_knowledge_base: string[] | null;
  bedrock_inference_profile?: string;
  post_call_transcription_webhook?: { url: string; hmac_secret?: string };
  post_call_audio_webhook?: { url: string; hmac_secret?: string };
};

function hasWebhookSecret(config: OrchestratorConfig): boolean {
  return [
    config.postCallTranscriptionWebhook,
    config.postCallAudioWebhook,
  ].some(webhook => webhook?.hmacSecret !== undefined);
}

/**
 * Throws if a webhook signing secret would be sent from the browser without
 * the development-only `allowInsecureWebhookSecret` opt-in.
 */
export function assertOrchestratorWebhookSecretAllowed(
  config: OrchestratorConfig
): void {
  if (!hasWebhookSecret(config)) {
    return;
  }
  if (config.allowInsecureWebhookSecret !== true) {
    throw new Error(
      "Orchestrator webhook hmacSecret is visible to every user of the page and lets them forge signed webhook deliveries. Configure the signing secret on the orchestrator instead, or set allowInsecureWebhookSecret: true for development only."
    );
  }
  console.warn(
    "[ElevenLabs] Sending an orchestrator webhook hmacSecret from the browser (allowInsecureWebhookSecret). Anyone using this page can read it; do not use this in production."
  );
}

function webhookToWire(webhook: PostCallWebhookConfig, allowSecret: boolean) {
  return {
    url: webhook.url,
    ...(allowSecret && webhook.hmacSecret !== undefined
      ? { hmac_secret: webhook.hmacSecret }
      : {}),
  };
}

export function constructEnclaveSetupConfig(
  config: OrchestratorConfig
): EnclaveSetupConfigEvent {
  const event: EnclaveSetupConfigEvent = {
    type: ENCLAVE_SETUP_CONFIG_TYPE,
    agent_config_dict: config.agentConfig ?? null,
    override_agent_config_list: config.agentConfigOverrides ?? null,
    tools_config_list: config.tools ?? null,
    prompt_knowledge_base: config.promptKnowledgeBase ?? null,
  };

  if (config.bedrockInferenceProfile !== undefined) {
    event.bedrock_inference_profile = config.bedrockInferenceProfile;
  }
  const allowSecret = config.allowInsecureWebhookSecret === true;
  if (config.postCallTranscriptionWebhook) {
    event.post_call_transcription_webhook = webhookToWire(
      config.postCallTranscriptionWebhook,
      allowSecret
    );
  }
  if (config.postCallAudioWebhook) {
    event.post_call_audio_webhook = webhookToWire(
      config.postCallAudioWebhook,
      allowSecret
    );
  }

  return event;
}
