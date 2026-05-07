import { test, expect } from "bun:test"
import { getTestServer } from "tests/fixtures/get-test-server"
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"

test("disk proxy file resolution", async () => {
  const { ky } = await getTestServer()

  const tempDir = await mkdtemp(join(tmpdir(), "file-proxy-test-"))

  try {
    await writeFile(join(tempDir, "test.txt"), "Hello from disk proxy!")
    await writeFile(join(tempDir, "data.json"), '{"key": "value"}')

    await mkdir(join(tempDir, "subdir"))
    await writeFile(
      join(tempDir, "subdir", "nested.txt"),
      "Nested file content",
    )

    const createRes = await ky.post("file_proxies/create", {
      json: {
        proxy_type: "disk",
        disk_path: tempDir,
        matching_pattern: "disk-test/*",
      },
    })
    expect(createRes.status).toBe(200)

    const downloadRes = await ky.get("files/download/disk-test/test.txt")
    expect(downloadRes.status).toBe(200)
    expect(await downloadRes.text()).toBe("Hello from disk proxy!")
    expect(downloadRes.headers.get("content-type")).toBe("text/plain")

    const jsonRes = await ky.get("files/download/disk-test/data.json")
    expect(jsonRes.status).toBe(200)
    expect(await jsonRes.json()).toEqual({ key: "value" })
    expect(jsonRes.headers.get("content-type")).toBe("application/json")

    const nestedRes = await ky.get("files/download/disk-test/subdir/nested.txt")
    expect(nestedRes.status).toBe(200)
    expect(await nestedRes.text()).toBe("Nested file content")

    const missingRes = await ky.get("files/download/disk-test/non-existent.txt")
    expect(missingRes.status).toBe(404)
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
})

test("disk proxy with query param download", async () => {
  const { ky } = await getTestServer()

  const tempDir = await mkdtemp(join(tmpdir(), "file-proxy-query-test-"))

  try {
    await writeFile(
      join(tempDir, "query-test.txt"),
      "Query param download test",
    )

    await ky.post("file_proxies/create", {
      json: {
        proxy_type: "disk",
        disk_path: tempDir,
        matching_pattern: "query-disk/*",
      },
    })

    const downloadRes = await ky.get("files/download", {
      searchParams: { file_path: "/query-disk/query-test.txt" },
    })
    expect(downloadRes.status).toBe(200)
    expect(await downloadRes.text()).toBe("Query param download test")
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
})

test("disk proxy binary file", async () => {
  const { ky } = await getTestServer()

  const tempDir = await mkdtemp(join(tmpdir(), "file-proxy-binary-test-"))

  try {
    const binaryData = new Uint8Array([0x00, 0x01, 0x02, 0xff, 0xfe, 0xfd])
    await writeFile(join(tempDir, "binary.bin"), binaryData)

    await ky.post("file_proxies/create", {
      json: {
        proxy_type: "disk",
        disk_path: tempDir,
        matching_pattern: "binary-test/*",
      },
    })

    const downloadRes = await ky.get("files/download/binary-test/binary.bin")
    expect(downloadRes.status).toBe(200)
    expect(new Uint8Array(await downloadRes.arrayBuffer())).toEqual(binaryData)
    expect(downloadRes.headers.get("content-type")).toBe(
      "application/octet-stream",
    )
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
})
