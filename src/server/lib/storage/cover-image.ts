import "server-only";

import { randomUUID } from "node:crypto";

import { del, put } from "@vercel/blob";

import { getBlobReadWriteToken } from "@/lib/env";

/** Prefix that scopes every cover blob, used to recognize our own URLs. */
const COVER_PREFIX = "lives";

export type CoverUploadResult =
  | { ok: true; url: string }
  | { ok: false };

/**
 * Stores a validated cover image in Vercel Blob under `lives/{userId}/{uuid}.{ext}`.
 * The user id comes from the session (never the client) and the filename is a
 * random uuid, so the original filename never reaches the storage path and
 * collisions are impossible.
 */
export async function uploadCoverImage(
  userId: string,
  ext: string,
  contentType: string,
  body: Uint8Array,
): Promise<CoverUploadResult> {
  const token = getBlobReadWriteToken();
  if (!token) {
    return { ok: false };
  }

  try {
    const blob = await put(
      `${COVER_PREFIX}/${userId}/${randomUUID()}.${ext}`,
      Buffer.from(body),
      {
        access: "public",
        contentType,
        token,
        addRandomSuffix: false,
      },
    );
    return { ok: true, url: blob.url };
  } catch {
    return { ok: false };
  }
}

/** True for URLs that point at a cover blob we own (so deletion is in-scope). */
function isOwnedCoverUrl(url: string): boolean {
  try {
    const { pathname } = new URL(url);
    return pathname.includes(`/${COVER_PREFIX}/`);
  } catch {
    return false;
  }
}

/**
 * Best-effort deletion of a previously uploaded cover. Failures are swallowed:
 * a leftover blob is acceptable, but a delete error must never break saving the
 * live. External (non-blob) URLs are ignored.
 */
export async function deleteCoverImage(url: string | null): Promise<void> {
  if (!url || !isOwnedCoverUrl(url)) {
    return;
  }

  const token = getBlobReadWriteToken();
  if (!token) {
    return;
  }

  try {
    await del(url, { token });
  } catch {
    // Ignore — orphan cleanup is best-effort.
  }
}
