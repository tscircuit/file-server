import { withRouteSpec } from "lib/middleware/with-winter-spec"
import { z } from "zod"

const fileProxyInputSchema = z.discriminatedUnion("proxy_type", [
  z.object({
    proxy_type: z.literal("disk"),
    disk_path: z.string(),
    matching_pattern: z.string().regex(/^.+\/\*$/, {
      message: "matching_pattern must end with /*",
    }),
  }),
  z.object({
    proxy_type: z.literal("http"),
    http_target_url: z.string().url(),
    matching_pattern: z.string().regex(/^.+\/\*$/, {
      message: "matching_pattern must end with /*",
    }),
  }),
])

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
  methods: ["POST"],
  jsonBody: fileProxyInputSchema,
  jsonResponse: z.union([
    z.object({
      file_proxy: fileProxyOutputSchema,
    }),
    z.object({
      error: z.object({
        message: z.string(),
      }),
    }),
  ]),
})((req, ctx) => {
  const proxyInput = req.jsonBody

  // Check if a proxy with the same matching_pattern already exists
  const existingProxy = ctx.db.getFileProxy({
    matching_pattern: proxyInput.matching_pattern,
  })
  if (existingProxy) {
    return ctx.json(
      {
        error: {
          message: `A file proxy with matching_pattern "${proxyInput.matching_pattern}" already exists`,
        },
      },
      { status: 400 },
    )
  }

  const file_proxy = ctx.db.createFileProxy(proxyInput)
  return ctx.json({ file_proxy })
})
