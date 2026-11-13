import { withRouteSpec } from "lib/middleware/with-winter-spec"
import { z } from "zod"
import { createFileDownloadResponse } from "lib/utils/file-download-response"
import { resolveFileProxy } from "lib/utils/resolve-file-proxy"

export default withRouteSpec({
  methods: ["GET"],
  queryParams: z.object({
    file_id: z.string().optional(),
    file_path: z.string().optional(),
  }),
})(async (req, ctx) => {
  const { file_id, file_path } = req.query
  const file = ctx.db.getFile({ file_id, file_path })

  if (!file) {
    // Check if there's a matching proxy (only for file_path queries)
    if (file_path) {
      const proxy = ctx.db.matchFileProxy(file_path)
      if (proxy) {
        return resolveFileProxy(proxy, file_path)
      }
    }
    return new Response("File not found", { status: 404 })
  }

  return createFileDownloadResponse(file)
})
