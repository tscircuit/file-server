import { withRouteSpec } from "lib/middleware/with-winter-spec"
import { z } from "zod"

const fileProxyOutputSchema = z.discriminatedUnion("proxy_type", [
  z.object({
    file_proxy_id: z.string(),
    proxy_type: z.literal("disk"),
    disk_path: z.string(),
    matching_pattern: z.string(),
    created_at: z.string(),
  }),
  z.object({
    file_proxy_id: z.string(),
    proxy_type: z.literal("http"),
    http_target_url: z.string(),
    matching_pattern: z.string(),
    created_at: z.string(),
  }),
])

export default withRouteSpec({
  methods: ["GET"],
  queryParams: z.object({
    file_proxy_id: z.string().optional(),
    matching_pattern: z.string().optional(),
  }),
  jsonResponse: z.object({
    file_proxy: fileProxyOutputSchema.nullable(),
  }),
})((req, ctx) => {
  const { file_proxy_id, matching_pattern } = req.query
  const file_proxy =
    ctx.db.getFileProxy({ file_proxy_id, matching_pattern }) ?? null
  return ctx.json({ file_proxy })
})
