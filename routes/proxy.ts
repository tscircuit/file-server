import { withRouteSpec } from "lib/middleware/with-winter-spec"
import { z } from "zod"

export default withRouteSpec({
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
  jsonResponse: z.any(),
})((req, ctx) => {
  const targetUrl = req.headers.get("X-Target-Url")

  if (!targetUrl) {
    return ctx.json(
      { error: "X-Target-Url header is required" },
      { status: 400 },
    )
  }

  // Forward the request to the target URL
  return fetch(targetUrl, {
    method: req.method,
    headers: req.headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : req.body,
  })
})
