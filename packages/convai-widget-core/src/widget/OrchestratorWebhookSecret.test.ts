import { page } from "vitest/browser";
import { ws } from "msw";
import {
  describe,
  it,
  beforeAll,
  afterAll,
  afterEach,
  expect,
  vi,
} from "vitest";
import { Worker } from "../mocks/browser";
import "../mocks/web-component";

const ORCHESTRATOR_URL = "wss://orchestrator.test/convai";
const SECRET = "whsec_0123456789abcdef";

const sentFrames: string[] = [];
const orchestrator = ws.link(ORCHESTRATOR_URL);

function mountOrchestratorWidget(agentConfig: Record<string, unknown>) {
  const element = document.createElement("elevenlabs-convai");
  element.style.position = "absolute";
  element.setAttribute("orchestrator-url", ORCHESTRATOR_URL);
  element.setAttribute(
    "orchestrator-agent-config",
    JSON.stringify(agentConfig)
  );
  document.body.appendChild(element);
  return element;
}

describe("Orchestrator webhook signing secret", () => {
  beforeAll(async () => {
    await Worker.start({ quiet: true });
    Worker.use(
      orchestrator.addEventListener("connection", ({ client }) => {
        client.addEventListener("message", event => {
          if (typeof event.data === "string") {
            sentFrames.push(event.data);
          }
        });
      })
    );
  });
  afterAll(() => Worker.stop());
  afterEach(() => {
    sentFrames.length = 0;
    document.querySelectorAll("elevenlabs-convai").forEach(el => el.remove());
    vi.restoreAllMocks();
  });

  it("forwards webhook URLs without a secret in enclave_setup_config", async () => {
    mountOrchestratorWidget({
      post_call_transcription_webhook: { url: "https://example.com/hook" },
    });

    await page.getByRole("button", { name: "Start a call" }).click();

    await expect
      .poll(() => sentFrames.find(f => f.includes("enclave_setup_config")), {
        timeout: 10_000,
      })
      .toBeDefined();
    const setup = JSON.parse(
      sentFrames.find(f => f.includes("enclave_setup_config"))!
    );
    expect(setup.post_call_transcription_webhook).toEqual({
      url: "https://example.com/hook",
    });
  });

  it.each(["post_call_transcription_webhook", "post_call_audio_webhook"])(
    "never sends an hmac_secret from the page attribute (%s)",
    async key => {
      const consoleError = vi.spyOn(console, "error");
      mountOrchestratorWidget({
        [key]: { url: "https://example.com/hook", hmac_secret: SECRET },
      });

      const startButton = page.getByRole("button", { name: "Start a call" });
      const refused = () =>
        consoleError.mock.calls.some(args =>
          String(args[0]).includes("hmac_secret")
        );
      // A refused config leaves the widget unrendered, so there may be no
      // button; if one renders, start the call so any setup frame is sent.
      await expect.poll(() => refused() || !!startButton.query()).toBe(true);
      if (startButton.query()) {
        await startButton.click();
      }
      await new Promise(resolve => setTimeout(resolve, 3000));

      expect(sentFrames.join("\n")).not.toContain(SECRET);
      expect(sentFrames.join("\n")).not.toContain("hmac_secret");
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining("hmac_secret")
      );
    }
  );
});
