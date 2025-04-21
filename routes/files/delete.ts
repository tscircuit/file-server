import { withRouteSpec } from "lib/middleware/with-winter-spec"
import { z } from "zod"

export default withRouteSpec({
  methods: ["DELETE"],
  jsonBody: z
    .object({
      file_id: z.string().optional(),
      file_path: z.string().optional(),
      initiator: z.string().optional(),
    })
    .refine((data) => data.file_id || data.file_path, {
      message: "Either file_id or file_path must be provided",
    }),
  jsonResponse: z.union([z.null(), z.object({ error: z.string() })]),
})(async (req, ctx) => {
  const body = await req.json()
  const file_id = body?.file_id
  const file_path = body?.file_path
  const initiator = body?.initiator

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
