import { withRouteSpec } from "lib/middleware/with-winter-spec"
import { z } from "zod"
import { normalizePath } from "lib/utils/normalize-path"

export default withRouteSpec({
  methods: ["POST"],
  jsonBody: z.object({
    old_file_path: z.string(),
    new_file_path: z.string(),
    initiator: z.string().optional(),
  }),
  jsonResponse: z.object({
    file: z
      .object({
        file_id: z.string(),
        file_path: z.string(),
        text_content: z.string().optional(),
        binary_content_b64: z.string().optional(),
        created_at: z.string(),
      })
      .nullable(),
  }),
})(async (req, ctx) => {
  const body = await req.json()
  if (!normalizePath(body.new_file_path)) {
    return new Response("new_file_path must name a file", { status: 400 })
  }

  // First check if the old file exists
  const oldFile = ctx.db.getFileByPath(body.old_file_path)
  if (!oldFile) {
    return ctx.json({ file: null }, { status: 404 })
  }

  // Check if new file path already exists
  const existingFile = ctx.db.getFileByPath(body.new_file_path)
  if (existingFile) {
    return ctx.json({ file: null }, { status: 409 })
  }

  // Rename the file
  const file = ctx.db.renameFile(body.old_file_path, body.new_file_path, {
    initiator: body.initiator,
  })

  if (!file) {
    return ctx.json({ file: null }, { status: 500 })
  }

  return ctx.json({ file })
})
