/**
 * Build a Content-Disposition header that survives odd file names.
 *
 * Plain ASCII names keep the exact legacy shape (`attachment; filename="x"`). Names with a quote,
 * a backslash or a non-ASCII character break that header, so those get a sanitised ASCII fallback
 * plus the exact name in the RFC 6266 `filename*` parameter.
 */
export function contentDisposition(filePath: string): string {
  const name = filePath.split("/").pop() || "download"
  const needsEncoding = !/^[ -~]*$/.test(name) || /[\\"]/.test(name)
  if (!needsEncoding) return `attachment; filename="${name}"`

  const fallback = name.replace(/[\\"]/g, "_").replace(/[^ -~]/g, "_")
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(name)}`
}
