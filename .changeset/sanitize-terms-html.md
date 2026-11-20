---
"@elevenlabs/convai-widget-core": patch
---

Sanitize the agent's `terms_html` before rendering the terms modal so only basic formatting tags and `http`, `https` and `mailto` links are kept.
