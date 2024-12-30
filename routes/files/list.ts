import { withRouteSpec } from "lib/middleware/with-winter-spec"
import { z } from "zod"

export default withRouteSpec({
  methods: ["GET"],
  jsonResponse: z.object({
    file_list: z.array(
      z.object({
        file_id: z.string(),
        file_path: z.string(),
      }),
    ),
  }),
})((req, ctx) => {
  return ctx.json({
    file_list: ctx.db.files.map(({ file_id, file_path }) => ({
      file_id,
      file_path,
    })),
  })
})
