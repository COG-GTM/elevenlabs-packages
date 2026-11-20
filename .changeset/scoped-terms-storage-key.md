---
"@elevenlabs/convai-widget-core": patch
---

Store terms acceptance under a namespaced `localStorage` key (`elevenlabs_convai_terms_<agentId>_<terms_key>`) and only treat the exact `"true"` marker as acceptance, so a configured `terms_key` can no longer read or overwrite the host page's own storage entries. Visitors who accepted terms under the old key will be asked once more.
