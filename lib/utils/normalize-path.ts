export function normalizePath(path: string): string {
  if (!path || path === "/") return ""
  // collapse every group of repeated slashes (and backslash mixes), not just the first
  let normalized = path.replace(/\\+/g, "/").replace(/\/{2,}/g, "/")
  if (normalized.startsWith("/")) {
    normalized = normalized.slice(1)
  }
  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1)
  }
  return normalized
}
