/**
 * Returns the URL only if it is a plain https:// link (no javascript:, data:,
 * credentials or odd ports). Used for external "Apply" links in posts.
 */
export function safeExternalUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    if (url.port && url.port !== "443") return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** "2026-11-05" -> "5 Nov 2026" without time-zone surprises. */
export function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d} ${months[m - 1]} ${y}`;
}
