import { page, userEvent } from "vitest/browser";
import {
  describe,
  it,
  beforeAll,
  afterAll,
  afterEach,
  expect,
  vi,
} from "vitest";
import { ws } from "msw";
import { Worker } from "../mocks/browser";
import "../mocks/web-component";

const ORCHESTRATOR_URL = "ws://orchestrator.test/convai";
const SECRET = "0123456789abcdef-page-secret";

const orchestrator = ws.link(ORCHESTRATOR_URL);
let received: string[] = [];
let mounted: HTMLElement | null = null;

function mountOrchestratorWidget(agentConfig: Record<string, unknown>) {
  const element = document.createElement("elevenlabs-convai");
  element.style.position = "absolute";
  element.setAttribute(
    "orchestrator-url",
    ORCHESTRATOR_URL.replace(/^ws:/, "http:")
  );
  element.setAttribute(
    "orchestrator-agent-config",
    JSON.stringify(agentConfig)
  );
  document.body.appendChild(element);
  mounted = element;
}

async function sendText(text: string) {
  await page.getByRole("button", { name: "Message", exact: true }).click();
  await page.getByRole("textbox", { name: "Text message input" }).fill(text);
  await userEvent.keyboard("{Enter}");
}

describe("Orchestrator webhook signing secret", () => {
  beforeAll(async () => {
    await Worker.start({ quiet: true });
    Worker.use(
      orchestrator.addEventListener("connection", ({ client }) => {
        client.addEventListener("message", event => {
          if (typeof event.data === "string") received.push(event.data);
        });
        client.send(
          JSON.stringify({
            type: "conversation_initiation_metadata",
            conversation_initiation_metadata_event: {
              conversation_id: "orchestrator-conversation",
              agent_output_audio_format: "pcm_16000",
              user_input_audio_format: "pcm_16000",
            },
          })
        );
      })
    );
  });
  afterAll(() => Worker.stop());
  afterEach(() => {
    mounted?.remove();
    mounted = null;
    received = [];
    vi.restoreAllMocks();
  });

  it("sends webhook URLs to the orchestrator without any hmac_secret", async () => {
    mountOrchestratorWidget({
      post_call_transcription_webhook: { url: "https://example.com/t" },
      post_call_audio_webhook: { url: "https://example.com/a" },
    });

    await sendText("hello");

    await expect
      .poll(() => received.length, { timeout: 10000 })
      .toBeGreaterThan(0);
    const setup = JSON.parse(received[0]);
    expect(setup).toMatchObject({
      type: "enclave_setup_config",
      post_call_transcription_webhook: { url: "https://example.com/t" },
      post_call_audio_webhook: { url: "https://example.com/a" },
    });
    expect(received.join("\n")).not.toContain("hmac_secret");
  });

  it("refuses an hmac_secret from the page attribute and never sends it", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mountOrchestratorWidget({
      post_call_transcription_webhook: {
        url: "https://example.com/t",
        hmac_secret: SECRET,
      },
    });

    const chatButton = page.getByRole("button", {
      name: "Message",
      exact: true,
    });
    const rejected = () =>
      consoleErrorSpy.mock.calls.some(args =>
        String(args[0]).includes(
          "post_call_transcription_webhook.hmac_secret is not allowed"
        )
      );
    await expect.poll(() => rejected() || !!chatButton.query()).toBe(true);
    // Try to start a session if the widget offers one anyway.
    if (chatButton.query()) {
      await sendText("hello");
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    expect(received.join("\n")).not.toContain(SECRET);
    expect(received.join("\n")).not.toContain("hmac_secret");
    expect(rejected()).toBe(true);
  });
});
