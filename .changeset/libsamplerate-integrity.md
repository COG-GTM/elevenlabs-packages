---
"@elevenlabs/client": patch
---

Verify the default libsamplerate resampler worklet against a pinned SHA-256 hash before running it. The SDK now downloads the jsDelivr file with `fetch`, rejects it if the hash doesn't match, and loads the verified source from a `blob:`/`data:` URL instead of passing the CDN URL straight to `audioWorklet.addModule`. Setting `libsampleratePath` still loads that path as-is without contacting the CDN.
