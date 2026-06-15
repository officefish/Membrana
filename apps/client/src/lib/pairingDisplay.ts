/** Short prefix for displaying UUIDs in pairing UI. */
export function shortId(id: string, chars = 8): string {
  if (id.length <= chars + 1) return id;
  return `${id.slice(0, chars)}…`;
}

export function formatExpiresAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
