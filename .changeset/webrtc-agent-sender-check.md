---
"@elevenlabs/client": patch
---

Ignore WebRTC data messages that do not come from the agent participant, so other room participants can no longer trigger client tools, forge agent messages, or end the call. Agent identity is now matched by the `agent` prefix everywhere, including remote audio playback.
