/**
 * Validates that `orderedIds` is an exact permutation of `existingIds`: same
 * size, no duplicates, no missing, no extra and nothing foreign. Used on the
 * server to reject any manipulated reorder payload before persisting positions.
 */
export function isValidReorder(
  existingIds: string[],
  orderedIds: string[],
): boolean {
  if (existingIds.length !== orderedIds.length) {
    return false;
  }

  const existing = new Set(existingIds);
  const seen = new Set<string>();

  for (const id of orderedIds) {
    if (!existing.has(id) || seen.has(id)) {
      return false;
    }
    seen.add(id);
  }

  return true;
}
