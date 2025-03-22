import { withRouteSpec } from "lib/middleware/with-winter-spec"
import { z } from "zod"

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

  return new Response(file.text_content, {
    headers: {
      "Content-Type": "text/plain",
      "Content-Disposition": `attachment; filename="${file.file_path.split("/").pop()}"`,
    },
  })
})
