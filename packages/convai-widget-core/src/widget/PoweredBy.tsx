import { useWidgetConfig } from "../contexts/widget-config";
import { clsx } from "clsx";
import { isHttpsUrl } from "../utils/isHttpsUrl";

const DEFAULT_LINK = "https://elevenlabs.io/agents";

export function PoweredBy() {
  const config = useWidgetConfig();
  const overrideLink = config.value.override_link;

  if (config.value.disable_banner) {
    return null;
  }

  return (
    <p
      className={clsx(
        "whitespace-nowrap [line-height:var(--el-overlay-padding)] text-[10px] px-3 z-10",
        // A page has no overlay padding to sit in
        config.value.layout === "page"
          ? undefined
          : config.value.placement.startsWith("top")
            ? "-translate-y-[calc(var(--el-overlay-padding))]"
            : "translate-y-[calc(var(--el-overlay-padding))]"
      )}
    >
      <span className="opacity-30">Powered by</span>{" "}
      <a
        href={
          overrideLink && isHttpsUrl(overrideLink) ? overrideLink : DEFAULT_LINK
        }
        className="underline cursor-pointer pointer-events-auto focus-visible:outline-hidden opacity-30 hover:opacity-50 focus-visible:opacity-100 focus-visible:underline-offset-2"
        target="_blank"
        rel="noopener noreferrer"
      >
        ElevenAgents
      </a>
    </p>
  );
}
