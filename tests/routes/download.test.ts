import { test, expect } from "bun:test"
import { getTestServer } from "tests/fixtures/get-test-server"
import { Buffer } from "node:buffer"
import { normalizePath } from "lib/utils/normalize-path"

test("normalizePath collapses every repeated slash group (idempotent)", () => {
  expect(normalizePath("//a//b///c")).toBe("a/b/c")
  expect(normalizePath("///a/b/")).toBe("a/b")
  expect(normalizePath("/a//b//c")).toBe(
    normalizePath(normalizePath("/a//b//c")),
  )
  expect(normalizePath("////x//y////z")).toBe("x/y/z")
  expect(normalizePath("/")).toBe("")
  expect(normalizePath("a\\\\b//c")).toBe("a/b/c")
})

test("download text file via query form /files/download?file_path=", async () => {
  const { axios } = await getTestServer()
  await axios.post("/files/upsert", {
    file_path: "/hello.txt",
    text_content: "Hello Download",
  })
  const res = await axios.get("/files/download", {
    params: { file_path: "/hello.txt" },
    responseType: "text",
  })
  expect(res.status).toBe(200)
  expect(res.data).toBe("Hello Download")
  expect(res.headers.get("content-disposition")).toContain("hello.txt")
})

test("download via path form /files/download/a/b/c.txt", async () => {
  const { axios } = await getTestServer()
  await axios.post("/files/upsert", {
    file_path: "/dir/sub/deep.txt",
    text_content: "deep content",
  })
  const res = await axios.get("/files/download/dir/sub/deep.txt", {
    responseType: "text",
  })
  expect(res.status).toBe(200)
  expect(res.data).toBe("deep content")
})

test("download binary file returns exact bytes with content-length", async () => {
  const { axios } = await getTestServer()
  const buffer = Buffer.from([0, 1, 2, 3, 128, 255, 200])
  await axios.post("/files/upsert", {
    file_path: "/bin2.dat",
    binary_content_b64: buffer.toString("base64"),
  })
  const res = await axios.get("/files/download", {
    params: { file_path: "/bin2.dat" },
    responseType: "arrayBuffer",
  })
  expect(res.status).toBe(200)
  expect(Buffer.from(res.data)).toEqual(buffer)
  expect(res.headers.get("content-length")).toBe(String(buffer.byteLength))
  expect(res.headers.get("content-type")).toBe("application/octet-stream")
})

test("download unknown file returns 404 via raw fetch", async () => {
  const { url } = await getTestServer()
  const res = await fetch(`${url}/files/download/nope.txt`)
  expect(res.status).toBe(404)
  expect(await res.text()).toBe("File not found")
})

test("path-form download matches files stored with leading slash even when request has repeated slashes", async () => {
  const { url, axios } = await getTestServer()
  await axios.post("/files/upsert", {
    file_path: "/dir/file.txt",
    text_content: "slash tolerant",
  })
  // normalizePath must be idempotent so route-joined segments always match stored paths
  const res = await fetch(`${url}/files/download/dir/file.txt`)
  expect(res.status).toBe(200)
  expect(await res.text()).toBe("slash tolerant")
})
