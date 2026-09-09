import { afterEach, expect, test } from "bun:test"
import { getTestServer } from "tests/fixtures/get-test-server"
import { createFetchHandlerFromDir } from "winterspec/adapters/node"
import { createDatabase } from "lib/db/db-client"
import { join } from "node:path"

const content = "compressible payload ".repeat(1000)
const bytes = new TextEncoder().encode(content)
const compressed = Bun.gzipSync(bytes)

const getUpstream = (gzip: boolean) => {
  const body = gzip ? compressed : bytes
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch: () =>
      new Response(body, {
        headers: {
          "Content-Type": "text/plain",
          "Content-Length": body.byteLength.toString(),
          ...(gzip ? { "Content-Encoding": "gzip" } : {}),
        },
      }),
  })
  afterEach(() => server.stop(true))
  return server.url.toString()
}

for (const path of [
  "/proxy",
  "/files/download?file_path=compressed/test.txt",
  "/files/download/compressed/test.txt",
  "/files/static/compressed/test.txt",
]) {
  test(`proxy response length matches its decoded body via ${path}`, async () => {
    const upstream = getUpstream(true)
    const db = createDatabase()
    const handler = await createFetchHandlerFromDir(
      join(import.meta.dir, "../../routes"),
      {
        middleware: [
          async (req, ctx, next) => {
            Object.assign(ctx, { db })
            return next(req, ctx)
          },
        ],
      },
    )
    await handler("http://localhost/file_proxies/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        proxy_type: "http",
        http_target_url: upstream,
        matching_pattern: "compressed/*",
      }),
    })

    // Inspect the returned Response before Bun.serve can repair its length.
    // Node HTTP adapters use this header as-is and otherwise truncate the body.
    const response = await handler(`http://localhost${path}`, {
      headers: { "X-Target-Url": upstream },
    })
    expect(response.status).toBe(200)
    expect(response.headers.get("content-encoding")).toBeNull()
    const body = await response.arrayBuffer()
    expect(new TextDecoder().decode(body)).toBe(content)
    const length = response.headers.get("content-length")
    if (length !== null) {
      expect(Number(length)).toBe(body.byteLength)
    }
  })
}

for (const path of [
  "/files/download?file_path=compressed/test.txt",
  "/files/download/compressed/test.txt",
  "/files/static/compressed/test.txt",
]) {
  test(`HTTP file proxy returns complete decompressed content via ${path}`, async () => {
    const upstream = getUpstream(true)
    const { axios, url } = await getTestServer()
    await axios.post("/file_proxies/create", {
      proxy_type: "http",
      http_target_url: upstream,
      matching_pattern: "compressed/*",
    })

    const response = await fetch(`${url}${path}`)
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/plain")
    expect(response.headers.get("content-encoding")).toBeNull()
    expect(await response.text()).toBe(content)
  })
}

test("general proxy returns complete decompressed content", async () => {
  const upstream = getUpstream(true)
  const { url } = await getTestServer()
  const response = await fetch(`${url}/proxy`, {
    headers: { "X-Target-Url": upstream },
  })

  expect(response.status).toBe(200)
  expect(response.headers.get("content-type")).toBe("text/plain")
  expect(response.headers.get("content-encoding")).toBeNull()
  expect(await response.text()).toBe(content)
})

for (const gzip of [false, true]) {
  test(`general proxy preserves HEAD content length (gzip: ${gzip})`, async () => {
    const upstream = getUpstream(gzip)
    const { url } = await getTestServer()
    const response = await fetch(`${url}/proxy`, {
      method: "HEAD",
      headers: { "X-Target-Url": upstream },
    })

    expect(response.status).toBe(200)
    expect(response.headers.get("content-length")).toBe(
      (gzip ? compressed : bytes).byteLength.toString(),
    )
    expect(await response.text()).toBe("")
  })
}

test("HTTP file proxy still returns complete uncompressed content", async () => {
  const upstream = getUpstream(false)
  const { axios, url } = await getTestServer()
  await axios.post("/file_proxies/create", {
    proxy_type: "http",
    http_target_url: upstream,
    matching_pattern: "plain/*",
  })

  const response = await fetch(`${url}/files/download/plain/test.txt`)
  expect(response.status).toBe(200)
  expect(response.headers.get("content-type")).toBe("text/plain")
  expect(response.headers.get("content-disposition")).toBe(
    'attachment; filename="test.txt"',
  )
  expect(await response.text()).toBe(content)
})
