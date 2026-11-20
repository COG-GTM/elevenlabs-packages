---
"@elevenlabs/convai-widget-core": patch
---

Refuse `orchestrator-agent-config` when a post-call webhook sets `hmac_secret`. The attribute is public page markup, so any visitor could read the secret and forge signed webhook deliveries. Configure webhook signing secrets on the orchestrator server instead.
