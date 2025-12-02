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
  jsonResponse: z.object({
    file_proxies: z.array(fileProxyOutputSchema),
  }),
})((req, ctx) => {
  return ctx.json({
    file_proxies: ctx.db.listFileProxies(),
  })
})
