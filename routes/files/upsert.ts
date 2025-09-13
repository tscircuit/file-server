import { withRouteSpec } from "lib/middleware/with-winter-spec"
import { z } from "zod"

export default withRouteSpec({
  methods: ["POST"],
  jsonBody: z
    .object({
      file_id: z.string().optional(),
      text_content: z.string().optional(),
      binary_content_b64: z.string().optional(),
      file_path: z.string(),
      initiator: z.string().optional(),
    })
    .refine(
      (data) =>
        (data.text_content !== undefined) !==
        (data.binary_content_b64 !== undefined),
      {
        message: "Provide either text_content or binary_content_b64",
        path: ["text_content"],
      },
    ),
  jsonResponse: z.object({
    file: z.object({
      file_id: z.string(),
      file_path: z.string(),
      text_content: z.string().optional(),
      binary_content_b64: z.string().optional(),
      created_at: z.string(),
    }),
  }),
})(async (req, ctx) => {
  const body = await req.json()
  const file = ctx.db.upsertFile(body, { initiator: body.initiator })
  return ctx.json({ file })
})
