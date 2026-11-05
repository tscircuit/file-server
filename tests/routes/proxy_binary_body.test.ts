import { test, expect } from "bun:test"
import { getTestServer } from "tests/fixtures/get-test-server"
import http from "node:http"
import type { AddressInfo } from "node:net"

const BINARY_BODY = Uint8Array.from([0x00, 0xff, 0xfe, 0x80, 0x41])

test("proxy preserves binary request bodies for POST/PUT/PATCH/DELETE/OPTIONS", async () => {
  const { axios } = await getTestServer()

  const received: { method: string; body: Buffer }[] = []
  const echo = http.createServer((req, res) => {
    const chunks: Buffer[] = []
    req.on("data", (c: Buffer) => chunks.push(c))
    req.on("end", () => {
      const body = Buffer.concat(chunks)
      received.push({ method: req.method ?? "", body })
      res.end("ok")
    })
  })
  await new Promise<void>((resolve) => echo.listen(0, "127.0.0.1", resolve))
  const echoPort = (echo.address() as AddressInfo).port

  for (const method of ["post", "put", "patch", "delete", "options"] as const) {
    await axios.request({
      method,
      url: "/proxy",
      headers: {
        "X-Target-Url": `http://127.0.0.1:${echoPort}/`,
        "Content-Type": "application/octet-stream",
      },
      data: Buffer.from(BINARY_BODY),
      responseType: "text",
    })
    const last = received[received.length - 1]
    expect(last.method.toUpperCase()).toBe(method.toUpperCase())
    expect(Buffer.from(last.body)).toEqual(Buffer.from(BINARY_BODY))
  }

  echo.close()
})
