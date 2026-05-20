import { withRouteSpec } from "lib/middleware/with-winter-spec"
import { z } from "zod"
import { resolveFileProxy } from "lib/utils/resolve-file-proxy"
import { createFileDownloadResponse } from "lib/utils/create-file-download-response"

export default withRouteSpec({
  methods: ["GET"],
  pathParams: z.object({
    file_path: z.union([z.string(), z.array(z.string())]),
  }),
})(async (req, ctx) => {
  const { file_path } = req.routeParams as { file_path: string | string[] }
  const joinedFilePath = Array.isArray(file_path)
    ? file_path.join("/")
    : file_path
  const normalizedPath = `/${joinedFilePath}`
  const file = ctx.db.getFile({ file_path: normalizedPath })

  if (!file) {
    // Check if there's a matching proxy
    const proxy = ctx.db.matchFileProxy(normalizedPath)
    if (proxy) {
      return resolveFileProxy(proxy, normalizedPath)
    }
    return new Response("File not found", { status: 404 })
  }

  return createFileDownloadResponse(file)
})
