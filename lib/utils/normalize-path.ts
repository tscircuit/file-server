export function normalizePath(path: string): string {
  if (!path) return "/"
  // Remove duplicate slashes, ensure leading slash, remove trailing slash (except root)
  let normalized = path.replace(/\\+/g, "/").replace(/\/+/g, "/")
  if (!normalized.startsWith("/")) normalized = "/" + normalized
  if (normalized.length > 1 && normalized.endsWith("/"))
    normalized = normalized.slice(0, -1)
  return normalized
}
