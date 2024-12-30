import { withRouteSpec } from "lib/middleware/with-winter-spec"
import { z } from "zod"

export default withRouteSpec({
  methods: ["POST"],
  jsonBody: z.object({
    file_id: z.string().optional(),
    text_content: z.string(),
    file_path: z.string(),
  }),
  jsonResponse: z.object({
    file: z.object({
      file_id: z.string(),
      file_path: z.string(),
      text_content: z.string(),
      created_at: z.string(),
    }),
  }),
})(async (req, ctx) => {
  const body = await req.json()
  const file = ctx.db.upsertFile(body)
  return ctx.json({ file })
})
