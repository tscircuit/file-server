import { expect, test } from "bun:test"
import { mkdir, mkdtemp, writeFile } from "node:fs/promises"
import http from "node:http"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { getTestServer } from "tests/fixtures/get-test-server"

// Route-level regression: the download/static routes feed the raw request
// path into resolveFileProxy. HTTP clients normalize ".." out of the URL, so
// these tests speak raw HTTP via node:http, which sends the path verbatim.

const rawGet = (base: URL, path: string) =>
  new Promise<{ status: number; body: string }>((resolve, reject) => {
    const req = http.request(
      {
        host: base.hostname,
        port: Number(base.port),
        path,
        method: "GET",
      },
      (res) => {
        let body = ""
        res.on("data", (chunk) => {
          body += chunk
        })
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body }))
      },
    )
    req.on("error", reject)
    req.end()
  })

test("proxy download route blocks path traversal via raw HTTP", async () => {
  const { axios, url: rawUrl } = await getTestServer()
  const base = new URL(rawUrl)

  // Secret placed OUTSIDE the proxy root, a sibling of it.
  const parent = await mkdtemp(join(tmpdir(), "fserver-root-"))
  const secretPath = join(parent, "secret.txt")
  await writeFile(secretPath, "TOPSECRET")
  const root = join(parent, "wwwroot")
  await mkdir(root, { recursive: true })
  await writeFile(join(root, "a.txt"), "inside")

  const createRes = await axios.post("/file_proxies/create", {
    proxy_type: "disk",
    disk_path: root,
    matching_pattern: "local/*",
  })
  expect(createRes.status).toBe(200)

  // Traversal attempt reaching outside the root — must be refused.
  // (Bun/Winterspec may collapse ".." segments in its router before our guard
  // runs; either way the secret must never be served.)
  const out1 = await rawGet(base, "/files/download/local/../secret.txt")
  expect([400, 404]).toContain(out1.status)
  expect(out1.body).not.toContain("TOPSECRET")

  // Multi-level traversal attempt ("/etc/passwd"-shaped).
  const out2 = await rawGet(base, `/files/download/local/../../etc/passwd`)
  expect([400, 404]).toContain(out2.status)
  expect(out2.body).not.toContain("root:")

  // Positive control: normal proxy file still serves.
  const ok = await rawGet(base, `/files/download/local/a.txt`)
  expect(ok.status).toBe(200)
  expect(ok.body).toContain("inside")
})
