import { test, expect } from "bun:test"
import { getTestServer } from "tests/fixtures/get-test-server"
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"

test("disk proxy file resolution", async () => {
  const { axios } = await getTestServer()

  // Create a temp directory with test files
  const tempDir = await mkdtemp(join(tmpdir(), "file-proxy-test-"))

  try {
    // Create test files in the temp directory
    await writeFile(join(tempDir, "test.txt"), "Hello from disk proxy!")
    await writeFile(join(tempDir, "data.json"), '{"key": "value"}')

    // Create a subdirectory with a file
    await mkdir(join(tempDir, "subdir"))
    await writeFile(
      join(tempDir, "subdir", "nested.txt"),
      "Nested file content",
    )

    // Create a disk proxy pointing to the temp directory
    const createRes = await axios.post("/file_proxies/create", {
      proxy_type: "disk",
      disk_path: tempDir,
      matching_pattern: "disk-test/*",
    })
    expect(createRes.status).toBe(200)

    // Test downloading a file through the proxy
    const downloadRes = await axios.get("/files/download/disk-test/test.txt")
    expect(downloadRes.status).toBe(200)
    expect(downloadRes.data).toBe("Hello from disk proxy!")
    expect(downloadRes.headers.get("content-type")).toBe("text/plain")

    // Test downloading JSON file
    const jsonRes = await axios.get("/files/download/disk-test/data.json")
    expect(jsonRes.status).toBe(200)
    expect(jsonRes.data).toEqual({ key: "value" })
    expect(jsonRes.headers.get("content-type")).toBe("application/json")

    // Test downloading nested file
    const nestedRes = await axios.get(
      "/files/download/disk-test/subdir/nested.txt",
    )
    expect(nestedRes.status).toBe(200)
    expect(nestedRes.data).toBe("Nested file content")

    // Test 404 for non-existent file
    await expect(
      axios.get("/files/download/disk-test/non-existent.txt"),
    ).rejects.toMatchObject({
      status: 404,
    })
  } finally {
    // Clean up temp directory
    await rm(tempDir, { recursive: true, force: true })
  }
})

test("disk proxy with query param download", async () => {
  const { axios } = await getTestServer()

  // Create a temp directory with a test file
  const tempDir = await mkdtemp(join(tmpdir(), "file-proxy-query-test-"))

  try {
    await writeFile(
      join(tempDir, "query-test.txt"),
      "Query param download test",
    )

    // Create a disk proxy
    await axios.post("/file_proxies/create", {
      proxy_type: "disk",
      disk_path: tempDir,
      matching_pattern: "query-disk/*",
    })

    // Test downloading via query parameter
    const downloadRes = await axios.get("/files/download", {
      params: { file_path: "/query-disk/query-test.txt" },
    })
    expect(downloadRes.status).toBe(200)
    expect(downloadRes.data).toBe("Query param download test")
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
})

test("disk proxy binary file", async () => {
  const { axios } = await getTestServer()

  const tempDir = await mkdtemp(join(tmpdir(), "file-proxy-binary-test-"))

  try {
    // Create a binary file
    const binaryData = new Uint8Array([0x00, 0x01, 0x02, 0xff, 0xfe, 0xfd])
    await writeFile(join(tempDir, "binary.bin"), binaryData)

    // Create a disk proxy
    await axios.post("/file_proxies/create", {
      proxy_type: "disk",
      disk_path: tempDir,
      matching_pattern: "binary-test/*",
    })

    // Test downloading binary file
    const downloadRes = await axios.get(
      "/files/download/binary-test/binary.bin",
      {
        responseType: "arrayBuffer",
      },
    )
    expect(downloadRes.status).toBe(200)
    expect(new Uint8Array(downloadRes.data)).toEqual(binaryData)
    expect(downloadRes.headers.get("content-type")).toBe(
      "application/octet-stream",
    )
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
})
