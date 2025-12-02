import { withRouteSpec } from "lib/middleware/with-winter-spec"
import { z } from "zod"
import {
  decodeBase64ToUint8Array,
  uint8ArrayToArrayBuffer,
} from "lib/utils/decode-base64"
import { resolveFileProxy } from "lib/utils/resolve-file-proxy"

const getMimeType = (filePath: string): string => {
  const ext = filePath.split(".").pop()?.toLowerCase()

  const mimeTypes: Record<string, string> = {
    // Text
    txt: "text/plain",
    html: "text/html",
    htm: "text/html",
    css: "text/css",
    js: "text/javascript",
    json: "application/json",
    xml: "application/xml",

    // Images
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    svg: "image/svg+xml",
    webp: "image/webp",
    ico: "image/x-icon",

    // 3D models
    glb: "model/gltf-binary",

    // Audio
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",

    // Video
    mp4: "video/mp4",
    webm: "video/webm",

    // Documents
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

    // Archives
    zip: "application/zip",
    tar: "application/x-tar",
    gz: "application/gzip",
  }

  return mimeTypes[ext || ""] || "application/octet-stream"
}

export default withRouteSpec({
  methods: ["GET"],
  pathParams: z.object({
    file_path: z.union([z.string(), z.array(z.string())]),
  }),
})(async (req, ctx) => {
  const { file_path } = req.routeParams as {
    file_path: string | string[]
  }

  const joinedFilePath = Array.isArray(file_path)
    ? file_path.join("/")
    : file_path

  const normalizedPath = `/${joinedFilePath}`
  const file = ctx.db.getFile({ file_path: normalizedPath })

  if (!file) {
    // Check if there's a matching proxy
    const proxy = ctx.db.matchFileProxy(normalizedPath)
    if (proxy) {
      return resolveFileProxy(proxy, normalizedPath)
    }
    return new Response("File not found", { status: 404 })
  }

  const mimeType = getMimeType(file.file_path)
  if (file.binary_content_b64) {
    const binaryBody = decodeBase64ToUint8Array(file.binary_content_b64)
    const responseBody = uint8ArrayToArrayBuffer(binaryBody)

    return new Response(responseBody, {
      headers: {
        "Content-Type": mimeType,
        "Content-Length": binaryBody.byteLength.toString(),
      },
    })
  }

  return new Response(file.text_content!, {
    headers: {
      "Content-Type": mimeType,
    },
  })
})
