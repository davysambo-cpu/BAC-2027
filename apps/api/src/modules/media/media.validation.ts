import { basename } from "node:path";

import type { DailyReportAttachmentKind } from "@bac-2027/contracts";

import { ApplicationError } from "../../lib/errors";

export interface DetectedMediaType {
  kind: DailyReportAttachmentKind;
  mimeType: string;
  extension: string;
}

function startsWith(content: Buffer, signature: number[]): boolean {
  return signature.every((byte, index) => content[index] === byte);
}

export function detectMediaType(content: Buffer): DetectedMediaType | null {
  if (startsWith(content, [0xff, 0xd8, 0xff])) {
    return { kind: "image", mimeType: "image/jpeg", extension: "jpg" };
  }
  if (startsWith(content, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { kind: "image", mimeType: "image/png", extension: "png" };
  }
  if (
    content.subarray(0, 4).toString("ascii") === "RIFF" &&
    content.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { kind: "image", mimeType: "image/webp", extension: "webp" };
  }
  if (startsWith(content, [0x1a, 0x45, 0xdf, 0xa3])) {
    return { kind: "audio", mimeType: "audio/webm", extension: "webm" };
  }
  if (content.subarray(0, 4).toString("ascii") === "OggS") {
    return { kind: "audio", mimeType: "audio/ogg", extension: "ogg" };
  }
  if (
    content.subarray(0, 3).toString("ascii") === "ID3" ||
    (content[0] === 0xff && content[1] !== undefined && (content[1] & 0xe0) === 0xe0)
  ) {
    return { kind: "audio", mimeType: "audio/mpeg", extension: "mp3" };
  }
  if (content.subarray(0, 4).toString("ascii") === "RIFF") {
    if (content.subarray(8, 12).toString("ascii") === "WAVE") {
      return { kind: "audio", mimeType: "audio/wav", extension: "wav" };
    }
  }
  if (content.subarray(4, 8).toString("ascii") === "ftyp") {
    return { kind: "audio", mimeType: "audio/mp4", extension: "m4a" };
  }
  return null;
}

export function validateMedia(
  content: Buffer,
  expectedKind: DailyReportAttachmentKind,
  maximumBytes: number,
): DetectedMediaType {
  if (content.length === 0) {
    throw new ApplicationError("VALIDATION_ERROR", "Le fichier envoyé est vide.", 400);
  }
  if (content.length > maximumBytes) {
    throw new ApplicationError(
      "STORAGE_QUOTA_EXCEEDED",
      `Le fichier dépasse la limite de ${Math.floor(maximumBytes / 1024 / 1024)} Mo.`,
      413,
    );
  }
  const detected = detectMediaType(content);
  if (!detected || detected.kind !== expectedKind) {
    throw new ApplicationError(
      "UNSUPPORTED_MEDIA_TYPE",
      expectedKind === "image"
        ? "Cette image n'est pas au format JPEG, PNG ou WebP."
        : "Cet audio n'est pas dans un format pris en charge.",
      415,
    );
  }
  return detected;
}

export function safeOriginalName(value: string): string {
  const fileName = basename(value.replaceAll("\\", "/"));
  const cleaned = [...fileName]
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join("")
    .trim();
  return (cleaned || "media").slice(0, 255);
}
