const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}

/**
 * Escapes a value for safe interpolation into an HTML template (both element
 * content and quoted attribute values). Admin pages interpolate user-written
 * strings (file paths, event payloads) directly into HTML, so every
 * interpolation of user-controlled data must go through this helper.
 */
export function escapeHtml(value: unknown): string {
  return String(value).replace(/[&<>"']/g, (char) => ESCAPES[char])
}
