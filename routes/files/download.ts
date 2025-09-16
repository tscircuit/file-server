import { withRouteSpec } from "lib/middleware/with-winter-spec"
import { z } from "zod"
import {
  decodeBase64ToUint8Array,
  uint8ArrayToArrayBuffer,
} from "lib/utils/decode-base64"

export default withRouteSpec({
  methods: ["GET"],
  queryParams: z.object({
    file_id: z.string().optional(),
    file_path: z.string().optional(),
  }),
})((req, ctx) => {
  const { file_id, file_path } = req.query
  const file = ctx.db.getFile({ file_id, file_path })

  if (!file) {
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
