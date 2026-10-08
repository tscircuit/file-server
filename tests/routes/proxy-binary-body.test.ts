import { expect, test } from "bun:test"
import { getTestServer } from "../fixtures/get-test-server"

test.each(["POST", "PUT", "PATCH", "DELETE", "OPTIONS"])(
  "proxy preserves binary request bytes for %s",
  async (method) => {
    const { url } = await getTestServer()
    const payload = new Uint8Array([0x00, 0xff, 0xfe, 0x80, 0x41])
    const upstream = Bun.serve({
      port: 0,
      async fetch(req) {
        return new Response(await req.arrayBuffer(), {
          headers: { "Content-Type": "application/octet-stream" },
        })
      },
    })

    try {
      const response = await fetch(`${url}/proxy`, {
        method,
        headers: {
          "X-Target-Url": `http://127.0.0.1:${upstream.port}`,
          "Content-Type": "application/octet-stream",
        },
        body: payload,
        signal: AbortSignal.timeout(3000),
      })
      expect(response.status).toBe(200)
      expect(new Uint8Array(await response.arrayBuffer())).toEqual(payload)
    } finally {
      upstream.stop(true)
    }
  },
)
