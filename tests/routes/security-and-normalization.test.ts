import { test, expect } from "bun:test"
import { normalizePath } from "lib/utils/normalize-path"
import { getTestServer } from "tests/fixtures/get-test-server"
import { mkdir, writeFile, rm } from "node:fs/promises"
import { join } from "node:path"

test("normalizePath is idempotent across multiple repeated slash groups", () => {
  expect(normalizePath("a///b///c.txt")).toBe("a/b/c.txt")
  expect(normalizePath("a//b//c//d")).toBe("a/b/c/d")
  expect(normalizePath("//a//b//c//")).toBe("a/b/c")
  expect(normalizePath(normalizePath("a///b///c.txt"))).toBe(
    normalizePath("a///b///c.txt"),
  )
})

test("disk proxy blocks path traversal attempts (CWE-22)", async () => {
  const { axios } = await getTestServer()

  const testDir = "/tmp/test-file-server-proxy-traversal"
  const secretFile = "/tmp/test-file-server-secret.txt"

  await mkdir(testDir, { recursive: true })
  await writeFile(join(testDir, "allowed.txt"), "allowed content")
  await writeFile(secretFile, "secret content outside proxy")

  try {
    await axios.post("/file_proxies/create", {
      matching_pattern: "sandbox/*",
      proxy_type: "disk",
      disk_path: testDir,
    })

    // Allowed file should succeed
    const allowedRes = await axios.get("/files/download/sandbox/allowed.txt")
    expect(allowedRes.status).toBe(200)
    expect(allowedRes.data).toBe("allowed content")

    // Path traversal via query param should be rejected with 403 Forbidden
    expect(
      axios.get("/files/download", {
        params: { file_path: "sandbox/../test-file-server-secret.txt" },
      }),
    ).rejects.toMatchObject({
      status: 403,
    })
  } finally {
    await rm(testDir, { recursive: true, force: true })
    await rm(secretFile, { force: true })
  }
})
