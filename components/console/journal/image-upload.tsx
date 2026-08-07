"use client";

import { useRef, useState } from "react";
import { consoleApi, errorMessage } from "@/lib/console-api";

export interface UploadedImage {
  url: string;
  key: string;
  size: number;
  contentType: string;
}

/**
 * Uploads an image and hands back its permanent URL.
 *
 * The API returns a stable `/journal/images/<key>` URL rather than a signed
 * one, because this string is written into a published post body — a URL that
 * expired would break every article a few minutes after publishing.
 */
export function useImageUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File): Promise<UploadedImage | null> => {
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.set("file", file);
      return await consoleApi<UploadedImage>("/api/journal/images", {
        method: "POST",
        body,
      });
    } catch (caught) {
      setError(errorMessage(caught));
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading, error, setError };
}

/**
 * A hidden file input plus the button that opens it.
 *
 * The input is reset after every pick so choosing the same file twice still
 * fires a change event — otherwise a failed upload cannot be retried with the
 * same file, which is exactly when you would want to.
 */
export function ImagePickerButton({
  onPicked,
  disabled,
  label = "Upload",
  className,
}: {
  onPicked: (file: File) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onPicked(file);
        }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => input.current?.click()}
        className={
          className ??
          "cursor-pointer whitespace-nowrap rounded-[10px] border border-hair px-4 py-2.5 font-mono text-[9px] tracking-[0.14em] text-primary transition hover:border-primary disabled:cursor-wait disabled:opacity-60"
        }
      >
        {label}
      </button>
    </>
  );
}
