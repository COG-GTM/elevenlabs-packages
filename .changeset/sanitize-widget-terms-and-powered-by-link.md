---
"@elevenlabs/convai-widget-core": patch
---

Sanitize `terms_html` (from the agent config, `override-config`, or language presets) before rendering it in the terms modal, and only accept `http:`/`https:` URLs for the Powered-by `override_link`, falling back to the default link otherwise.
