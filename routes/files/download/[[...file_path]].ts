import { withRouteSpec } from "lib/middleware/with-winter-spec"
import { z } from "zod"
import {
  decodeBase64ToUint8Array,
  uint8ArrayToArrayBuffer,
} from "lib/utils/decode-base64"
import { resolveFileProxy } from "lib/utils/resolve-file-proxy"

export default withRouteSpec({
  methods: ["GET"],
  pathParams: z.object({
    file_path: z.union([z.string(), z.array(z.string())]),
  }),
})(async (req, ctx) => {
  const { file_path } = req.routeParams as { file_path: string | string[] }
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

  const isText = file.text_content !== undefined
  if (!isText && file.binary_content_b64) {
    const binaryBody = decodeBase64ToUint8Array(file.binary_content_b64)
    const responseBody = uint8ArrayToArrayBuffer(binaryBody)
    return new Response(responseBody, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${file.file_path
          .split("/")
          .pop()}"`,
        "Content-Length": binaryBody.byteLength.toString(),
      },
    })
  }

  return new Response(file.text_content!, {
    headers: {
      "Content-Type": "text/plain",
      "Content-Disposition": `attachment; filename="${file.file_path
        .split("/")
        .pop()}"`,
    },
  })
})
