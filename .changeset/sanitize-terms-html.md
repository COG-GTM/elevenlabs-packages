---
"@elevenlabs/convai-widget-core": patch
---

Sanitize the agent's `terms_html` before rendering the terms modal. Script-capable markup (event handler attributes, `<script>`, `<style>`, `<iframe>`, `javascript:` links) is removed; formatting tags and `https`/`mailto` links are kept.
