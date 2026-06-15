import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { del, put } from "@vercel/blob";

import { getBlobReadWriteToken } from "@/lib/env";

/** Prefix that scopes every cover blob, used to recognize our own URLs. */
const COVER_PREFIX = "lives";
const LOCAL_UPLOAD_PREFIX = "/uploads/lives";

export type CoverUploadResult =
  | { ok: true; url: string }
  | { ok: false };

function canUseLocalCoverStorage(): boolean {
  return process.env.NODE_ENV === "development";
}

export function isCoverUploadAvailable(): boolean {
  return Boolean(getBlobReadWriteToken()) || canUseLocalCoverStorage();
}

async function uploadCoverImageLocally(
  userId: string,
  ext: string,
  body: Uint8Array,
): Promise<CoverUploadResult> {
  const fileName = `${randomUUID()}.${ext}`;
  const relativeUrl = `${LOCAL_UPLOAD_PREFIX}/${userId}/${fileName}`;
  const directory = path.join(process.cwd(), "public", "uploads", "lives", userId);

  try {
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, fileName), Buffer.from(body), {
      flag: "wx",
    });
    return { ok: true, url: relativeUrl };
  } catch {
    return { ok: false };
  }
}

/**
 * Stores a validated cover image. Production uses Vercel Blob; local
 * development falls back to `public/uploads/lives` when Blob is not configured.
 * The user id comes from the session (never the client) and the filename is a
 * random uuid, so the original filename never reaches the storage path.
 */
export async function uploadCoverImage(
  userId: string,
  ext: string,
  contentType: string,
  body: Uint8Array,
): Promise<CoverUploadResult> {
  const token = getBlobReadWriteToken();
  if (!token) {
    return canUseLocalCoverStorage()
      ? uploadCoverImageLocally(userId, ext, body)
      : { ok: false };
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
  } catch (error) {
    // Surface the cause (name/message only, never file content) to debug 502s.
    console.error("Cover upload to Vercel Blob failed.", {
      cause:
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : "UnknownError",
    });
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

function localCoverPath(url: string): string | null {
  try {
    const pathname = url.startsWith("/")
      ? url
      : new URL(url).pathname;

    if (!pathname.startsWith(`${LOCAL_UPLOAD_PREFIX}/`)) {
      return null;
    }

    const relativePath = pathname.slice(1);
    const absolutePath = path.join(process.cwd(), "public", relativePath);
    const uploadRoot = path.join(process.cwd(), "public", "uploads", "lives");

    return absolutePath.startsWith(uploadRoot) ? absolutePath : null;
  } catch {
    return null;
  }
}

/**
 * Best-effort deletion of a previously uploaded cover. Failures are swallowed:
 * a leftover blob is acceptable, but a delete error must never break saving the
 * live. External (non-blob) URLs are ignored.
 */
export async function deleteCoverImage(url: string | null): Promise<void> {
  if (!url) {
    return;
  }

  const localPath = localCoverPath(url);
  if (localPath) {
    try {
      await unlink(localPath);
    } catch {
      // Ignore — orphan cleanup is best-effort.
    }
    return;
  }

  if (!isOwnedCoverUrl(url)) {
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
