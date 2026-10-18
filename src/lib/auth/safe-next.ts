/**
 * Where to go after signing in. Only same-site admin paths are allowed, so a
 * crafted link like /admin/login?next=https://evil.com can't redirect elsewhere.
 */
export function safeAdminNext(raw: string | null | undefined): string {
  if (!raw) return "/admin";
  let path: string;
  try {
    path = decodeURIComponent(raw);
  } catch {
    return "/admin";
  }
  if (!path.startsWith("/admin") || path.startsWith("//") || path.includes("\\") || /[\r\n]/.test(path)) return "/admin";
  if (path !== "/admin" && !path.startsWith("/admin/") && !path.startsWith("/admin?")) return "/admin";
  if (path.startsWith("/admin/login")) return "/admin";
  return path;
}
