import { describe, expect, test } from "bun:test"
import { mkdir, mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { FileProxy } from "lib/db/schema"
import { resolveFileProxy } from "lib/utils/resolve-file-proxy"

// Issue: the disk proxy resolved join(diskPath, relativePath) with no
// parent-segment or containment check, and the HTTP proxy forwarded
// whatever traversal segments it received. A request like
// /files/download/local/../../etc/passwd escaped the proxy root
// (CWE-22 path traversal).

describe("file proxy path traversal protection", () => {
  const makeDiskProxy = (diskPath: string): FileProxy =>
    ({
      file_proxy_id: "fp1",
      proxy_type: "disk",
      disk_path: diskPath,
      matching_pattern: "local/*",
      created_at: new Date().toISOString(),
    }) as FileProxy

  test("rejects .. segments for disk proxies", async () => {
    const res = await resolveFileProxy(
      makeDiskProxy("/tmp/some-root"),
      "/local/../secret.txt",
    )
    expect(res.status).toBe(400)
    expect(await res.text()).not.toContain("secret")
  })

  test("rejects multi-level traversal", async () => {
    const res = await resolveFileProxy(
      makeDiskProxy("/tmp/some-root"),
      "/local/../../etc/passwd",
    )
    expect(res.status).toBe(400)
  })

  test("rejects traversal embedded deeper in the path", async () => {
    const res = await resolveFileProxy(
      makeDiskProxy("/tmp/some-root"),
      "/local/sub/../../../etc/passwd",
    )
    expect(res.status).toBe(400)
  })

  test("rejects .. segments for http proxies", async () => {
    const proxy: FileProxy = {
      file_proxy_id: "fp2",
      proxy_type: "http",
      http_target_url: "https://example.com/files",
      matching_pattern: "remote/*",
      created_at: new Date().toISOString(),
    } as FileProxy
    const res = await resolveFileProxy(proxy, "/remote/../admin")
    expect(res.status).toBe(400)
  })

  test("still serves files inside the proxy root", async () => {
    const root = await mkdtemp(join(tmpdir(), "fserver-proxy-"))
    await writeFile(join(root, "a.txt"), "inside-content")
    const res = await resolveFileProxy(makeDiskProxy(root), "/local/a.txt")
    expect(res.status).toBe(200)
    expect(await res.text()).toBe("inside-content")
  })

  test("still serves files inside nested directories of the root", async () => {
    const root = await mkdtemp(join(tmpdir(), "fserver-proxy-"))
    await mkdir(join(root, "nested"), { recursive: true })
    await writeFile(join(root, "nested", "b.txt"), "nested-content")
    const res = await resolveFileProxy(
      makeDiskProxy(root),
      "/local/nested/b.txt",
    )
    expect(res.status).toBe(200)
    expect(await res.text()).toBe("nested-content")
  })

  test("resolve()+startsWith containment refuses escapes without .. too", async () => {
    const root = await mkdtemp(join(tmpdir(), "fserver-proxy-"))
    // absolute-ish relative segment can't happen after slice(prefix), but a
    // platform separator surprise is handled by the containment check
    const res = await resolveFileProxy(
      makeDiskProxy(root + "/inner"),
      "/local/" + join("..", "secret.txt").replace(getSep(), "/"),
    )
    expect(res.status).toBe(400)
  })
})

function getSep(): string {
  return process.platform === "win32" ? "\\" : "/"
}
