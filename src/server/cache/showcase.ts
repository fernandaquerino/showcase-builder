import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";

export const SHOWCASE_REVALIDATE_SECONDS = 60 * 60;

export function showcaseTag(handle: string): string {
  return `showcase:${handle}`;
}

export function liveTag(liveId: string): string {
  return `live:${liveId}`;
}

export function revalidatePublicShowcase(input: {
  handle: string;
  liveId?: string | null;
}): void {
  revalidatePath(`/${input.handle}`);
  revalidateTag(showcaseTag(input.handle), "max");

  if (input.liveId) {
    revalidateTag(liveTag(input.liveId), "max");
  }
}
