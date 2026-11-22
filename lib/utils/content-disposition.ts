/**
 * Build a safe `Content-Disposition: attachment` header value for a file
 * download (RFC 6266 / RFC 5987).
 *
 * The download routes used to interpolate the raw file name into the
 * header, which breaks in two ways:
 * - a non-ASCII file name (e.g. `报告.pdf`) makes `new Response()` throw
 *   `TypeError: Header 'Content-Disposition' has invalid value`, so the
 *   download fails entirely instead of returning the file.
 * - a file name containing `"` produces a malformed header
 *   (`filename="my "quoted".txt"`).
 *
 * To keep existing behavior (and tests) untouched, plain ASCII file names
 * keep the exact historical form `attachment; filename="name.txt"`.
 * Anything else gets a sanitized ASCII fallback plus an RFC 5987
 * `filename*` parameter carrying the exact UTF-8 name, so browsers still
 * save the file under its real name.
 */
export function getAttachmentContentDisposition(filePath: string): string {
  const fileName = filePath.split("/").pop() ?? ""

  if (!fileName) {
    return `attachment; filename="file"`
  }

  // Safe for a quoted-string: printable ASCII except `"` and `\`.
  const isSafeAscii = /^[\x20-\x7e]+$/.test(fileName) && !/["\\]/.test(fileName)
  if (isSafeAscii) {
    return `attachment; filename="${fileName}"`
  }

  const fallback = fileName
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\]/g, "_")
    .trim()
  const safeFallback = fallback.length > 0 ? fallback : "file"

  return (
    `attachment; filename="${safeFallback}"; ` +
    `filename*=UTF-8''${encodeURIComponent(fileName)}`
  )
}
