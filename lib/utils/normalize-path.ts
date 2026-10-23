export function normalizePath(path: string): string {
  if (!path || path === "/") return ""
  // Collapse every repeated group of separators to a single "/", so
  // normalizePath is idempotent: normalizing twice yields the same path.
  let normalized = path.replace(/\\+/g, "/").replace(/\/\/+/g, "/")
  if (normalized.startsWith("/")) {
    normalized = normalized.slice(1)
  }
  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1)
  }
  return normalized
}
