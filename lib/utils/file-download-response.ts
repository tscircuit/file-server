import {
  decodeBase64ToUint8Array,
  uint8ArrayToArrayBuffer,
} from "lib/utils/decode-base64"

// RFC 6266: plain ASCII `filename` for old clients, `filename*` for the real
// name. Header values must be ASCII, so non-ASCII names can't go in as-is.
export const getContentDisposition = (filePath: string): string => {
  const filename = filePath.split("/").pop() || "download"
  const asciiFallback = filename.replace(/[^\x20-\x7e]|["\\]/g, "_")
  if (asciiFallback === filename) {
    return `attachment; filename="${filename}"`
  }
  const encoded = encodeURIComponent(filename).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  )
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`
}

export const createFileDownloadResponse = (file: {
  file_path: string
  text_content?: string
  binary_content_b64?: string
}): Response => {
  const contentDisposition = getContentDisposition(file.file_path)

  if (file.text_content === undefined && file.binary_content_b64) {
    const binaryBody = decodeBase64ToUint8Array(file.binary_content_b64)
    return new Response(uint8ArrayToArrayBuffer(binaryBody), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": contentDisposition,
        "Content-Length": binaryBody.byteLength.toString(),
      },
    })
  }

  return new Response(file.text_content ?? "", {
    headers: {
      "Content-Type": "text/plain",
      "Content-Disposition": contentDisposition,
    },
  })
}
