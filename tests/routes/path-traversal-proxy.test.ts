import { expect, test } from "bun:test"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { FileProxy } from "lib/db/schema"
import { resolveFileProxy } from "lib/utils/resolve-file-proxy"
import { getTestServer } from "tests/fixtures/get-test-server"

test("resolveFileProxy rejects path traversal with '..' segments", async () => {
  const diskProxy: FileProxy = {
    file_proxy_id: "proxy-1",
    proxy_type: "disk",
    disk_path: "/srv/files-root",
    matching_pattern: "local/*",
    created_at: new Date().toISOString(),
  }

  const httpProxy: FileProxy = {
    file_proxy_id: "proxy-2",
    proxy_type: "http",
    http_target_url: "https://example.com/files",
    matching_pattern: "remote/*",
    created_at: new Date().toISOString(),
  }

  // Traversal on disk proxy
  const resDisk1 = await resolveFileProxy(diskProxy, "local/../secret.txt")
  expect(resDisk1.status).toBe(400)
  expect(await resDisk1.text()).toBe("Invalid path: path traversal not allowed")

  const resDisk2 = await resolveFileProxy(diskProxy, "local/../../etc/passwd")
  expect(resDisk2.status).toBe(400)

  const resDisk3 = await resolveFileProxy(
    diskProxy,
    "local/nested/../../secret.txt",
  )
  expect(resDisk3.status).toBe(400)

  // Traversal on http proxy
  const resHttp = await resolveFileProxy(httpProxy, "remote/../admin")
  expect(resHttp.status).toBe(400)
  expect(await resHttp.text()).toBe("Invalid path: path traversal not allowed")
})

test("route-level traversal in /files/download is rejected", async () => {
  const { axios } = await getTestServer()
  const tempDir = await mkdtemp(join(tmpdir(), "traversal-test-"))

  try {
    await writeFile(join(tempDir, "allowed.txt"), "Safe file inside proxy")

    const createRes = await axios.post("/file_proxies/create", {
      proxy_type: "disk",
      disk_path: tempDir,
      matching_pattern: "safe-disk/*",
    })
    expect(createRes.status).toBe(200)

    // Valid query access works
    const validRes = await axios.get("/files/download", {
      params: { file_path: "safe-disk/allowed.txt" },
    })
    expect(validRes.status).toBe(200)
    expect(validRes.data).toBe("Safe file inside proxy")

    // Traversal via query param is blocked with 400
    await expect(
      axios.get("/files/download", {
        params: { file_path: "safe-disk/../secret.txt" },
      }),
    ).rejects.toMatchObject({
      status: 400,
    })

    await expect(
      axios.get("/files/download", {
        params: { file_path: "safe-disk/../../etc/passwd" },
      }),
    ).rejects.toMatchObject({
      status: 400,
    })
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
})
