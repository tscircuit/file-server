import { withRouteSpec } from "lib/middleware/with-winter-spec"
import { z } from "zod"

export default withRouteSpec({
  methods: ["GET"],
  queryParams: z.object({
    since: z.string().optional(),
    event_type: z.string().optional(),
  }),
  jsonResponse: z.object({
    event_list: z.array(
      z
        .object({
          event_id: z.string(),
          event_type: z.string(),
          file_path: z.string().optional(),
          created_at: z.string(),
        })
        .passthrough(),
    ),
  }),
})((req, ctx) => {
  const { since, event_type } = req.query
  return ctx.json({ event_list: ctx.db.listEvents({ since, event_type }) })
})
