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

  // The X-Sender-* headers are the intended (and only) source of these
  // request-identity headers. The caller — e.g. a browser making a
  // same-origin request to this proxy on localhost — must not leak its
  // OWN Cookie/Origin/Referer to the proxied third-party target. Doing
  // so leaks session/analytics cookies (privacy bug) and can trip the
  // target's WAF: easyeda's CloudFront returns 403 when the forwarded
  // request carries the caller's localhost cookies. Clear the inherited
  // values first, then re-apply only what the caller explicitly set via
  // X-Sender-*.
  headers.delete("Cookie")
  headers.delete("Origin")
  headers.delete("Referer")

  // Browser fetch-metadata headers describe the caller's same-origin
  // fetch and are meaningless / misleading to the proxied target.
  headers.delete("Sec-Fetch-Site")
  headers.delete("Sec-Fetch-Mode")
  headers.delete("Sec-Fetch-Dest")

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
