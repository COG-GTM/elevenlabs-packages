import { page } from "vitest/browser";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { Worker } from "../../mocks/browser";
import { setupWebComponent } from "../../mocks/web-component";

describe("Markdown image download", () => {
  beforeAll(() => Worker.start({ quiet: true }));
  afterAll(() => Worker.stop());

  let downloads: string[];

  beforeEach(() => {
    downloads = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      if (this.download) {
        downloads.push(this.download);
      }
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    setupWebComponent({
      "agent-id": "markdown_image_download",
      variant: "compact",
      "default-expanded": "true",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not save a non-image response", async () => {
    const button = page.getByRole("button", { name: "Download" }).nth(0);
    await expect.element(button).toBeInTheDocument();
    (button.element() as HTMLElement).click();

    await vi.waitFor(() =>
      expect(
        downloads.length + vi.mocked(console.error).mock.calls.length
      ).toBeGreaterThan(0)
    );
    expect(downloads).toEqual([]);
  });

  it("names the saved file from the image type, not the URL", async () => {
    const button = page.getByRole("button", { name: "Download" }).nth(1);
    await expect.element(button).toBeInTheDocument();
    (button.element() as HTMLElement).click();

    await vi.waitFor(() => expect(downloads).toEqual(["Team_photo.png"]));
  });
});
