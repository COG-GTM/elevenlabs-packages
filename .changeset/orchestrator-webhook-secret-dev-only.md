---
"@elevenlabs/client": minor
"@elevenlabs/convai-widget-core": minor
---

Reject orchestrator webhook `hmacSecret` values sent from the browser unless the development-only `allowInsecureWebhookSecret` option (client) or `orchestrator-allow-insecure-webhook-secret="true"` attribute (widget) is set. The secret is readable by every visitor of the page, so production signing secrets belong on the orchestrator. A warning is logged whenever the opt-in is used.
