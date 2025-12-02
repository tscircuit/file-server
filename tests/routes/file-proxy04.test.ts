import { test, expect } from "bun:test"
import { getTestServer } from "tests/fixtures/get-test-server"
import { mkdtemp, writeFile, rm } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"

test("database file takes precedence over proxy", async () => {
  const { axios } = await getTestServer()

  const tempDir = await mkdtemp(join(tmpdir(), "file-proxy-precedence-"))

  try {
    // Create a file on disk
    await writeFile(join(tempDir, "test.txt"), "Disk content")

    // Create a disk proxy
    await axios.post("/file_proxies/create", {
      proxy_type: "disk",
      disk_path: tempDir,
      matching_pattern: "precedence/*",
    })

    // Create a file in the database with the same path
    await axios.post("/files/upsert", {
      file_path: "/precedence/test.txt",
      text_content: "Database content",
    })

    // Database file should take precedence
    const downloadRes = await axios.get("/files/download/precedence/test.txt")
    expect(downloadRes.status).toBe(200)
    expect(downloadRes.data).toBe("Database content")
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
})

test("proxy pattern matching with deep paths", async () => {
  const { axios } = await getTestServer()

  const tempDir = await mkdtemp(join(tmpdir(), "file-proxy-deep-"))

  try {
    // Create deeply nested file
    const { mkdir } = await import("node:fs/promises")
    await mkdir(join(tempDir, "a", "b", "c"), { recursive: true })
    await writeFile(
      join(tempDir, "a", "b", "c", "deep.txt"),
      "Deep nested content",
    )

    // Create a disk proxy
    await axios.post("/file_proxies/create", {
      proxy_type: "disk",
      disk_path: tempDir,
      matching_pattern: "deep/*",
    })

    // Test downloading deeply nested file
    const downloadRes = await axios.get("/files/download/deep/a/b/c/deep.txt")
    expect(downloadRes.status).toBe(200)
    expect(downloadRes.data).toBe("Deep nested content")
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
})

test("multiple proxies with different patterns", async () => {
  const { axios } = await getTestServer()

  const tempDir1 = await mkdtemp(join(tmpdir(), "file-proxy-multi1-"))
  const tempDir2 = await mkdtemp(join(tmpdir(), "file-proxy-multi2-"))

  try {
    // Create files in different directories
    await writeFile(join(tempDir1, "file1.txt"), "Content from dir 1")
    await writeFile(join(tempDir2, "file2.txt"), "Content from dir 2")

    // Create two different proxies
    await axios.post("/file_proxies/create", {
      proxy_type: "disk",
      disk_path: tempDir1,
      matching_pattern: "multi1/*",
    })

    await axios.post("/file_proxies/create", {
      proxy_type: "disk",
      disk_path: tempDir2,
      matching_pattern: "multi2/*",
    })

    // Test that each proxy serves its own files
    const res1 = await axios.get("/files/download/multi1/file1.txt")
    expect(res1.data).toBe("Content from dir 1")

    const res2 = await axios.get("/files/download/multi2/file2.txt")
    expect(res2.data).toBe("Content from dir 2")

    // Test that proxies don't cross
    await expect(
      axios.get("/files/download/multi1/file2.txt"),
    ).rejects.toMatchObject({
      status: 404,
    })

    await expect(
      axios.get("/files/download/multi2/file1.txt"),
    ).rejects.toMatchObject({
      status: 404,
    })
  } finally {
    await rm(tempDir1, { recursive: true, force: true })
    await rm(tempDir2, { recursive: true, force: true })
  }
})

test("no proxy match returns 404", async () => {
  const { axios } = await getTestServer()

  // Create a proxy with a specific pattern
  const tempDir = await mkdtemp(join(tmpdir(), "file-proxy-nomatch-"))

  try {
    await writeFile(join(tempDir, "exists.txt"), "File exists")

    await axios.post("/file_proxies/create", {
      proxy_type: "disk",
      disk_path: tempDir,
      matching_pattern: "specific/*",
    })

    // Path that doesn't match any proxy pattern should 404
    await expect(
      axios.get("/files/download/unmatched/file.txt"),
    ).rejects.toMatchObject({
      status: 404,
      data: "File not found",
    })
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
})

test("proxy pattern with leading slash normalization", async () => {
  const { axios } = await getTestServer()

  const tempDir = await mkdtemp(join(tmpdir(), "file-proxy-slash-"))

  try {
    await writeFile(join(tempDir, "normalized.txt"), "Normalized path content")

    // Create proxy with pattern (without leading slash in pattern)
    await axios.post("/file_proxies/create", {
      proxy_type: "disk",
      disk_path: tempDir,
      matching_pattern: "slash-test/*",
    })

    // Should work with leading slash in the request path
    const res = await axios.get("/files/download/slash-test/normalized.txt")
    expect(res.status).toBe(200)
    expect(res.data).toBe("Normalized path content")
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
})
