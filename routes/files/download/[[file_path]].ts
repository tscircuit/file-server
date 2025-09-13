import { withRouteSpec } from "lib/middleware/with-winter-spec"
import { z } from "zod"
import { Buffer } from "node:buffer"

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
