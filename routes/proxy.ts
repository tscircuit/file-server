import { withRouteSpec } from "lib/middleware/with-winter-spec"
import { z } from "zod"

export default withRouteSpec({
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
  jsonResponse: z.any(),
})(async (req, ctx) => {
  const targetUrl = req.headers.get("X-Target-Url")

  if (!targetUrl) {
    return ctx.json(
      { error: "X-Target-Url header is required" },
      { status: 400 },
    )
  }

  let body = undefined
  if (["POST", "PUT", "PATCH"].includes(req.method)) {
    body = await req.clone().text()
  }

  const headers = new Headers(req.headers)

  // Forward the request to the target URL
  return fetch(targetUrl, {
    method: req.method,
    headers: headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : body,
  })
})
