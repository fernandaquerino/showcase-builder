/**
 * Shared rules for the live cover image upload. Used by the client component for
 * an early check and by the server route as the authoritative validation.
 */

export const COVER_IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/** Accepted MIME types mapped to the extension used in the storage path. */
export const COVER_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const COVER_IMAGE_ACCEPT = Object.keys(COVER_IMAGE_TYPES).join(",");

export const COVER_IMAGE_MESSAGES = {
  invalidType: "A imagem deve ser JPG, PNG ou WebP.",
  tooLarge: "A imagem deve ter no máximo 5 MB.",
  uploadFailed: "Não foi possível enviar a imagem. Tente novamente.",
} as const;

export type CoverImageValidationError = "invalidType" | "tooLarge";

/**
 * Validates a file's type and size. Returns the message key when invalid, or
 * `null` when the file is acceptable. The MIME check is enforced again on the
 * server from the magic bytes, so this cannot be bypassed by spoofing the type.
 */
export function validateCoverImageFile(file: {
  type: string;
  size: number;
}): CoverImageValidationError | null {
  if (!(file.type in COVER_IMAGE_TYPES)) {
    return "invalidType";
  }
  if (file.size > COVER_IMAGE_MAX_BYTES) {
    return "tooLarge";
  }
  return null;
}

/**
 * Confirms the bytes really are a JPEG, PNG or WebP by inspecting the magic
 * number, returning the canonical extension. A spoofed `Content-Type` therefore
 * cannot smuggle an SVG/HTML/script payload past the upload route.
 */
export function sniffCoverImageExtension(bytes: Uint8Array): string | null {
  // JPEG: FF D8 FF
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "png";
  }
  // WebP: "RIFF" .... "WEBP"
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }
  return null;
}
