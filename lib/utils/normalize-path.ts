export function normalizePath(path: string): string {
  if (!path || path === "/") return ""
  const segments = path.replace(/\+/g, "/").split("/")
  const resolved: string[] = []
  for (const segment of segments) {
    if (!segment || segment === ".") continue
    if (segment === "..") {
      resolved.pop()
      continue
    }
    resolved.push(segment)
  }
  return resolved.join("/")
}
