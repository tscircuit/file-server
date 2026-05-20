import type { File } from "lib/db/schema"
import {
  decodeBase64ToUint8Array,
  uint8ArrayToArrayBuffer,
} from "lib/utils/decode-base64"

const getDownloadFilename = (filePath: string) => {
  return filePath.split("/").filter(Boolean).pop() || "download"
}

const getContentDisposition = (filePath: string) => {
  const filename = getDownloadFilename(filePath)
  const fallback = filename.replace(/["\\]/g, "_")

  if (fallback === filename && /^[\x20-\x7e]+$/.test(filename)) {
    return `attachment; filename="${filename}"`
  }

  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(
    filename,
  )}`
}

export const createFileDownloadResponse = (file: File) => {
  const baseHeaders = {
    "Content-Disposition": getContentDisposition(file.file_path),
  }

  if (file.binary_content_b64) {
    const binaryBody = decodeBase64ToUint8Array(file.binary_content_b64)
    const responseBody = uint8ArrayToArrayBuffer(binaryBody)

    return new Response(responseBody, {
      headers: {
        ...baseHeaders,
        "Content-Type": "application/octet-stream",
        "Content-Length": binaryBody.byteLength.toString(),
      },
    })
  }

  const textBody = file.text_content ?? ""
  const textLength = new TextEncoder().encode(textBody).byteLength

  return new Response(textBody, {
    headers: {
      ...baseHeaders,
      "Content-Type": "text/plain",
      "Content-Length": textLength.toString(),
    },
  })
}
