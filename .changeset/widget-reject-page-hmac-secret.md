---
"@elevenlabs/convai-widget-core": patch
"@elevenlabs/convai-widget-embed": patch
---

Reject `hmac_secret` in the `orchestrator-agent-config` attribute. Page attributes are readable by every visitor, so the widget now refuses the config and logs an error instead of sending the signing secret to the orchestrator. Configure webhook signing on the orchestrator.
