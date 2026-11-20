import { useCallback, useContext } from "preact/compat";
import type { DetailedHTMLProps, ImgHTMLAttributes } from "react";
import type { ExtraProps } from "../utils/markdown";
import { cn } from "../../utils/cn";
import { StreamdownRuntimeContext } from "../index";
import { save } from "../utils/utils";
import { ContentBlock } from "./ContentBlock";
import { Button } from "../../components/Button";
import { useTextContents } from "../../contexts/text-contents";

const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};

function getImageExtension(mimeType: string): string | undefined {
  return IMAGE_EXTENSIONS[mimeType.split(";")[0].trim().toLowerCase()];
}

function getSafeBaseName(src: string, alt?: string): string {
  let pathName = "";
  try {
    pathName =
      new URL(src, window.location.origin).pathname.split("/").pop() || "";
  } catch {
    // Fall back to alt text or the default name
  }
  try {
    pathName = decodeURIComponent(pathName);
  } catch {
    // Keep the raw segment
  }
  const raw = alt || pathName.replace(/\.[^.]*$/, "");
  const sanitized = raw
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .replace(/^[_-]+|[_-]+$/g, "")
    .slice(0, 64);
  return sanitized || "image";
}

export async function downloadImage(src: string, alt?: string) {
  const response = await fetch(src);
  if (!response.ok) {
    throw new Error(`Image request failed with status ${response.status}`);
  }
  const blob = await response.blob();
  const extension = getImageExtension(blob.type);
  if (!extension) {
    throw new Error(`Refusing to download non-image content: ${blob.type}`);
  }
  save(`${getSafeBaseName(src, alt)}.${extension}`, blob, blob.type);
}

function useDownloadImage({
  src,
  alt,
  onError,
}: {
  src: string;
  alt?: string;
  onError?: (error: Error) => void;
}) {
  const { isAnimating } = useContext(StreamdownRuntimeContext);

  const handleDownload = useCallback(async () => {
    if (!src) {
      return;
    }

    try {
      await downloadImage(src.toString(), alt);
    } catch (error) {
      console.error("Failed to download image:", error);
      onError?.(error as Error);
    }
  }, [src, alt, onError]);

  return {
    downloadImage: handleDownload,
    disabled: isAnimating,
  };
}

type ImageComponentProps = DetailedHTMLProps<
  ImgHTMLAttributes<HTMLImageElement>,
  HTMLImageElement
> &
  ExtraProps;

export const ImageComponent = ({
  node,
  className,
  src,
  alt,
  ...props
}: ImageComponentProps) => {
  const { downloadImage, disabled } = useDownloadImage({
    src: src?.toString() || "",
    alt: alt?.toString(),
  });
  const textContents = useTextContents();

  if (!src) {
    return null;
  }

  return (
    <ContentBlock className="inline-block self-auto" data-streamdown="image-wrapper">
      <ContentBlock.Actions>
        <Button
          aria-label={textContents.download.value}
          disabled={disabled}
          icon="download"
          onClick={downloadImage}
          variant="md-button"
        >
          {textContents.download.value}
        </Button>
      </ContentBlock.Actions>
      <ContentBlock.Content>
        <img
          alt={alt}
          className={cn("max-w-full", className)}
          data-streamdown="image"
          src={src}
          {...props}
        />
      </ContentBlock.Content>
    </ContentBlock>
  );
};
