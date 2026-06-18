import { test, expect } from "bun:test"
import { getTestServer } from "tests/fixtures/get-test-server"
import { Buffer } from "node:buffer"

test("download text file via query param (?file_path=...)", async () => {
  const { axios } = await getTestServer()

  await axios.post("/files/upsert", {
    file_path: "/hello.txt",
    text_content: "Hello, download!",
  })

  const res = await axios.get("/files/download", {
    params: { file_path: "/hello.txt" },
  })

  expect(res.status).toBe(200)
  expect(res.data).toBe("Hello, download!")
  expect(res.headers.get("content-type")).toBe("text/plain")
  expect(res.headers.get("content-disposition")).toBe(
    'attachment; filename="hello.txt"',
  )
})

test("download text file via query param (?file_id=...)", async () => {
  const { axios } = await getTestServer()

  const upsertRes = await axios.post("/files/upsert", {
    file_path: "/id-download.txt",
    text_content: "Download by id",
  })
  const { file_id } = upsertRes.data.file

  const res = await axios.get("/files/download", {
    params: { file_id },
  })

  expect(res.status).toBe(200)
  expect(res.data).toBe("Download by id")
  expect(res.headers.get("content-disposition")).toBe(
    'attachment; filename="id-download.txt"',
  )
})

test("download binary file via query param returns correct bytes", async () => {
  const { axios } = await getTestServer()

  const buffer = Buffer.from([0xde, 0xad, 0xbe, 0xef, 0x00, 0xff])
  const base64 = buffer.toString("base64")

  await axios.post("/files/upsert", {
    file_path: "/data.bin",
    binary_content_b64: base64,
  })

  const res = await axios.get("/files/download", {
    params: { file_path: "/data.bin" },
    responseType: "arrayBuffer",
  })

  expect(res.status).toBe(200)
  expect(res.headers.get("content-type")).toBe("application/octet-stream")
  expect(res.headers.get("content-length")).toBe(buffer.length.toString())
  expect(res.headers.get("content-disposition")).toBe(
    'attachment; filename="data.bin"',
  )
  expect(Buffer.from(res.data)).toEqual(buffer)
})

test("download missing file returns 404 (query param)", async () => {
  const { axios } = await getTestServer()

  await expect(
    axios.get("/files/download", {
      params: { file_path: "/does-not-exist.txt" },
    }),
  ).rejects.toMatchObject({ status: 404 })
})

test("download text file via path form (/files/download/...)", async () => {
  const { axios } = await getTestServer()

  await axios.post("/files/upsert", {
    file_path: "/sub/dir/notes.txt",
    text_content: "Nested file download",
  })

  const res = await axios.get("/files/download/sub/dir/notes.txt")

  expect(res.status).toBe(200)
  expect(res.data).toBe("Nested file download")
  expect(res.headers.get("content-type")).toBe("text/plain")
  expect(res.headers.get("content-disposition")).toBe(
    'attachment; filename="notes.txt"',
  )
})

test("download binary file via path form returns correct bytes", async () => {
  const { axios } = await getTestServer()

  const buffer = Buffer.from([0x01, 0x02, 0x03, 0x80, 0xfe])
  const base64 = buffer.toString("base64")

  await axios.post("/files/upsert", {
    file_path: "/assets/image.bin",
    binary_content_b64: base64,
  })

  const res = await axios.get("/files/download/assets/image.bin", {
    responseType: "arrayBuffer",
  })

  expect(res.status).toBe(200)
  expect(res.headers.get("content-type")).toBe("application/octet-stream")
  expect(res.headers.get("content-length")).toBe(buffer.length.toString())
  expect(Buffer.from(res.data)).toEqual(buffer)
})

test("download missing file returns 404 (path form)", async () => {
  const { axios } = await getTestServer()

  await expect(
    axios.get("/files/download/ghost/file.txt"),
  ).rejects.toMatchObject({ status: 404 })
})

test("download top-level file via path form (single segment path)", async () => {
  const { axios } = await getTestServer()

  await axios.post("/files/upsert", {
    file_path: "/readme.md",
    text_content: "# Readme",
  })

  const res = await axios.get("/files/download/readme.md")
  expect(res.status).toBe(200)
  expect(res.data).toBe("# Readme")
  expect(res.headers.get("content-disposition")).toBe(
    'attachment; filename="readme.md"',
  )
})
