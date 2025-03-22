import { withRouteSpec } from "lib/middleware/with-winter-spec"
import { z } from "zod"

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

  return new Response(file.text_content, {
    headers: {
      "Content-Type": "text/plain",
      "Content-Disposition": `attachment; filename="${file.file_path.split("/").pop()}"`,
    },
  })
})
