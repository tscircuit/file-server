import { withRouteSpec } from "lib/middleware/with-winter-spec"
import { z } from "zod"
import { Buffer } from "node:buffer"

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
  const body = isText
    ? file.text_content
    : Buffer.from(file.binary_content_b64!, "base64")

  return new Response(body, {
    headers: {
      "Content-Type": isText ? "text/plain" : "application/octet-stream",
      "Content-Disposition": `attachment; filename="${file.file_path
        .split("/")
        .pop()}"`,
    },
  })
})
