export function normalizePath(path: string): string {
  if (!path || path === "/") return ""
  let normalized = path.replace(/\\+/g, "/").replace(/\/\/+/, "/")
  if (normalized.startsWith("/")) {
    normalized = normalized.slice(1)
  }
  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1)
  }
  return normalized
}
