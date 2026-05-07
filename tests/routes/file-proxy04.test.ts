import { test, expect } from "bun:test"
import { getTestServer } from "tests/fixtures/get-test-server"
import { mkdtemp, writeFile, rm } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"

test("database file takes precedence over proxy", async () => {
  const { ky } = await getTestServer()

  const tempDir = await mkdtemp(join(tmpdir(), "file-proxy-precedence-"))

  try {
    await writeFile(join(tempDir, "test.txt"), "Disk content")

    await ky.post("file_proxies/create", {
      json: {
        proxy_type: "disk",
        disk_path: tempDir,
        matching_pattern: "precedence/*",
      },
    })

    await ky.post("files/upsert", {
      json: {
        file_path: "/precedence/test.txt",
        text_content: "Database content",
      },
    })

    const downloadRes = await ky.get("files/download/precedence/test.txt")
    expect(downloadRes.status).toBe(200)
    expect(await downloadRes.text()).toBe("Database content")
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
})

test("proxy pattern matching with deep paths", async () => {
  const { ky } = await getTestServer()

  const tempDir = await mkdtemp(join(tmpdir(), "file-proxy-deep-"))

  try {
    const { mkdir } = await import("node:fs/promises")
    await mkdir(join(tempDir, "a", "b", "c"), { recursive: true })
    await writeFile(
      join(tempDir, "a", "b", "c", "deep.txt"),
      "Deep nested content",
    )

    await ky.post("file_proxies/create", {
      json: {
        proxy_type: "disk",
        disk_path: tempDir,
        matching_pattern: "deep/*",
      },
    })

    const downloadRes = await ky.get("files/download/deep/a/b/c/deep.txt")
    expect(downloadRes.status).toBe(200)
    expect(await downloadRes.text()).toBe("Deep nested content")
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
})

test("multiple proxies with different patterns", async () => {
  const { ky } = await getTestServer()

  const tempDir1 = await mkdtemp(join(tmpdir(), "file-proxy-multi1-"))
  const tempDir2 = await mkdtemp(join(tmpdir(), "file-proxy-multi2-"))

  try {
    await writeFile(join(tempDir1, "file1.txt"), "Content from dir 1")
    await writeFile(join(tempDir2, "file2.txt"), "Content from dir 2")

    await ky.post("file_proxies/create", {
      json: {
        proxy_type: "disk",
        disk_path: tempDir1,
        matching_pattern: "multi1/*",
      },
    })

    await ky.post("file_proxies/create", {
      json: {
        proxy_type: "disk",
        disk_path: tempDir2,
        matching_pattern: "multi2/*",
      },
    })

    const res1 = await ky.get("files/download/multi1/file1.txt")
    expect(await res1.text()).toBe("Content from dir 1")

    const res2 = await ky.get("files/download/multi2/file2.txt")
    expect(await res2.text()).toBe("Content from dir 2")

    const missing1 = await ky.get("files/download/multi1/file2.txt")
    expect(missing1.status).toBe(404)

    const missing2 = await ky.get("files/download/multi2/file1.txt")
    expect(missing2.status).toBe(404)
  } finally {
    await rm(tempDir1, { recursive: true, force: true })
    await rm(tempDir2, { recursive: true, force: true })
  }
})

test("no proxy match returns 404", async () => {
  const { ky } = await getTestServer()

  const tempDir = await mkdtemp(join(tmpdir(), "file-proxy-nomatch-"))

  try {
    await writeFile(join(tempDir, "exists.txt"), "File exists")

    await ky.post("file_proxies/create", {
      json: {
        proxy_type: "disk",
        disk_path: tempDir,
        matching_pattern: "specific/*",
      },
    })

    const missingRes = await ky.get("files/download/unmatched/file.txt")
    expect(missingRes.status).toBe(404)
    expect(await missingRes.text()).toBe("File not found")
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
})

test("proxy pattern with leading slash normalization", async () => {
  const { ky } = await getTestServer()

  const tempDir = await mkdtemp(join(tmpdir(), "file-proxy-slash-"))

  try {
    await writeFile(join(tempDir, "normalized.txt"), "Normalized path content")

    await ky.post("file_proxies/create", {
      json: {
        proxy_type: "disk",
        disk_path: tempDir,
        matching_pattern: "slash-test/*",
      },
    })

    const res = await ky.get("files/download/slash-test/normalized.txt")
    expect(res.status).toBe(200)
    expect(await res.text()).toBe("Normalized path content")
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
})
