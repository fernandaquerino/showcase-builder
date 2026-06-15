import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getBlobReadWriteToken } from "@/lib/env";
import {
  COVER_IMAGE_MAX_BYTES,
  COVER_IMAGE_MESSAGES,
  COVER_IMAGE_TYPES,
  sniffCoverImageExtension,
  validateCoverImageFile,
} from "@/lib/validations/cover-image";
import { uploadCoverImage } from "@/server/lib/storage/cover-image";

// Blob upload + `node:crypto` need the Node.js runtime (not Edge).
export const runtime = "nodejs";

type UploadResponse =
  | { success: true; url: string }
  | { success: false; message: string };

function error(message: string, status: number): NextResponse<UploadResponse> {
  return NextResponse.json({ success: false, message }, { status });
}

export async function POST(
  request: Request,
): Promise<NextResponse<UploadResponse>> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return error("Sua sessão expirou. Entre novamente.", 401);
  }

  if (!getBlobReadWriteToken()) {
    return error(COVER_IMAGE_MESSAGES.uploadFailed, 503);
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return error(COVER_IMAGE_MESSAGES.uploadFailed, 400);
  }

  // First gate: declared type and size (cheap, fails fast).
  const declaredError = validateCoverImageFile(file);
  if (declaredError === "tooLarge") {
    return error(COVER_IMAGE_MESSAGES.tooLarge, 413);
  }
  if (declaredError === "invalidType") {
    return error(COVER_IMAGE_MESSAGES.invalidType, 415);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength > COVER_IMAGE_MAX_BYTES) {
    return error(COVER_IMAGE_MESSAGES.tooLarge, 413);
  }

  // Authoritative check: the magic bytes must match a real JPEG/PNG/WebP, so a
  // spoofed Content-Type (e.g. an SVG labelled image/png) is rejected here.
  const ext = sniffCoverImageExtension(bytes);
  if (!ext) {
    return error(COVER_IMAGE_MESSAGES.invalidType, 415);
  }

  const contentType = Object.keys(COVER_IMAGE_TYPES).find(
    (type) => COVER_IMAGE_TYPES[type] === ext,
  );

  const result = await uploadCoverImage(
    userId,
    ext,
    contentType ?? file.type,
    bytes,
  );
  if (!result.ok) {
    return error(COVER_IMAGE_MESSAGES.uploadFailed, 502);
  }

  return NextResponse.json({ success: true, url: result.url }, { status: 200 });
}
