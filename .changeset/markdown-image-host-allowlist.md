---
"@elevenlabs/convai-widget-core": patch
---

Only load markdown images from the page origin and the hosts allowed for markdown links (`markdown-link-allowed-hosts`). Images on other hosts are shown as "[Image blocked]" instead of being fetched, so agent output cannot send chat data to an outside server through an image URL. `data:` images still render.
