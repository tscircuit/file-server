import { withRouteSpec } from "lib/middleware/with-winter-spec"
import { z } from "zod"

const PROXY_HEADERS = [
  "X-Target-Url",
  "X-Sender-Origin",
  "X-Sender-Host",
  "X-Sender-Referer",
  "X-Sender-User-Agent",
  "X-Sender-Cookie",
]

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

  // Add support for X-Sender-Origin and X-Sender-Host
  const senderOrigin = req.headers.get("X-Sender-Origin")
  if (senderOrigin) {
    headers.set("Origin", senderOrigin)
  }

  const senderHost = req.headers.get("X-Sender-Host")
  if (senderHost) {
    const hostValue = senderHost.replace(/^https?:\/\//, "")
    headers.set("Host", hostValue)
    headers.set("authority", hostValue)
  }

  // Add support for X-Sender-Referer
  const senderReferer = req.headers.get("X-Sender-Referer")
  if (senderReferer) {
    headers.set("Referer", senderReferer)
  }

  // Add support for X-Sender-User-Agent
  const senderUserAgent = req.headers.get("X-Sender-User-Agent")
  if (senderUserAgent) {
    headers.set("User-Agent", senderUserAgent)
  }

  // Add support for X-Sender-Cookie
  const senderCookie = req.headers.get("X-Sender-Cookie")
  if (senderCookie) {
    headers.set("Cookie", senderCookie)
  }

  // Remove proxy-specific headers before forwarding
  for (const header of PROXY_HEADERS) {
    headers.delete(header)
  }

  // Remove content-encoding to prevent decoding errors
  headers.delete("content-encoding")

  // Remove accept-encoding to prevent compression issues
  headers.delete("accept-encoding")

  try {
    // Forward the request to the target URL
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: ["GET", "HEAD"].includes(req.method) ? undefined : body,
    })

    // Create a new response with the target's body but without problematic headers
    const responseHeaders = new Headers(response.headers)
    responseHeaders.delete("content-encoding") // Ensure no content-encoding in response

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error("Proxy error:", error)
    return ctx.json(
      { error: { message: "Failed to proxy request" } },
      { status: 502 },
    )
  }
})
