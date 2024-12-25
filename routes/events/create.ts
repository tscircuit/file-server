import { withRouteSpec } from "lib/middleware/with-winter-spec"
import { z } from "zod"

export default withRouteSpec({
  methods: ["POST"],
  jsonBody: z
    .object({
      event_type: z.string(),
    })
    .passthrough(),
  jsonResponse: z.object({
    event: z
      .object({
        event_id: z.string(),
        event_type: z.string(),
        file_path: z.string().optional(),
        created_at: z.string(),
      })
      .passthrough(),
  }),
})(async (req, ctx) => {
  const { event_type, ...event_custom_params } = await req.json()
  const event = ctx.db.createEvent({
    event_type,
    ...event_custom_params,
    created_at: new Date().toISOString(),
  })
  return ctx.json({ event })
})
