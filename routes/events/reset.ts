import { withRouteSpec } from "lib/middleware/with-winter-spec"
import { z } from "zod"

export default withRouteSpec({
  methods: ["POST"],
  jsonResponse: z.object({
    ok: z.boolean(),
  }),
})((req, ctx) => {
  ctx.db.resetEvents()
  return ctx.json({ ok: true })
})
