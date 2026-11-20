---
"@elevenlabs/convai-widget-core": patch
---

Sanitize `terms_html` before rendering it in the terms modal. Only basic formatting tags and `http`, `https` and `mailto` links are kept; scripts, event handlers and other markup are removed.
