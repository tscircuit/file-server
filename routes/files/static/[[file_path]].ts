import { withRouteSpec } from "lib/middleware/with-winter-spec"
import { z } from "zod"
import { Buffer } from "node:buffer"

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
    file_path: z.string(),
  }),
})((req, ctx) => {
  const { file_path } = req.routeParams as { file_path: string }
  const file = ctx.db.getFile({ file_path: `/${file_path}` })

  if (!file) {
    return new Response("File not found", { status: 404 })
  }

  const mimeType = getMimeType(file.file_path)
  const body =
    file.text_content ?? Buffer.from(file.binary_content_b64!, "base64")

  return new Response(body, {
    headers: {
      "Content-Type": mimeType,
    },
  })
})
