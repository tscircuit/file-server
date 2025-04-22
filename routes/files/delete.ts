import { withRouteSpec } from "lib/middleware/with-winter-spec"
import { z } from "zod"

export default withRouteSpec({
  methods: ["POST", "DELETE"],
  commonParams: z.object({
    file_id: z.string().optional(),
    file_path: z.string().optional(),
    initiator: z.string().optional(),
  }),
  jsonResponse: z.union([z.null(), z.object({ error: z.string() })]),
})(async (req, ctx) => {
  const { file_id, file_path, initiator } = req.commonParams

  if (!file_id && !file_path) {
    return ctx.json(
      { error: "Either file_id or file_path must be provided" },
      { status: 400 },
    )
  }

  const deletedFile = ctx.db.deleteFile({ file_id, file_path }, { initiator })

  if (!deletedFile) {
    return ctx.json({ error: "File not found" }, { status: 404 })
  }

  return ctx.json(null, { status: 204 })
})
