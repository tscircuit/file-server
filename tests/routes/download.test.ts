import { test, expect } from "bun:test"
import { getTestServer } from "tests/fixtures/get-test-server"
import { Buffer } from "node:buffer"

test("download text file via query param file_path", async () => {
  const { axios } = await getTestServer()

  await axios.post("/files/upsert", {
    file_path: "/docs/readme.txt",
    text_content: "Hello from the file server",
  })

  const res = await axios.get("/files/download", {
    params: { file_path: "/docs/readme.txt" },
  })

  expect(res.status).toBe(200)
  expect(res.data).toBe("Hello from the file server")
  expect(res.headers.get("content-type")).toBe("text/plain")
  expect(res.headers.get("content-disposition")).toBe(
    'attachment; filename="readme.txt"',
  )
})

test("download text file via query param file_id", async () => {
  const { axios } = await getTestServer()

  const upsertRes = await axios.post("/files/upsert", {
    file_path: "/notes/hello.txt",
    text_content: "identified by id",
  })
  const { file_id } = upsertRes.data.file

  const res = await axios.get("/files/download", {
    params: { file_id },
  })

  expect(res.status).toBe(200)
  expect(res.data).toBe("identified by id")
  expect(res.headers.get("content-disposition")).toBe(
    'attachment; filename="hello.txt"',
  )
})

test("download binary file via query param file_path", async () => {
  const { axios } = await getTestServer()

  const buffer = Buffer.from([0xde, 0xad, 0xbe, 0xef])
  const base64 = buffer.toString("base64")

  await axios.post("/files/upsert", {
    file_path: "/assets/data.bin",
    binary_content_b64: base64,
  })

  const res = await axios.get("/files/download", {
    params: { file_path: "/assets/data.bin" },
    responseType: "arrayBuffer",
  })

  expect(res.status).toBe(200)
  expect(Buffer.from(res.data)).toEqual(buffer)
  expect(res.headers.get("content-type")).toBe("application/octet-stream")
  expect(res.headers.get("content-disposition")).toBe(
    'attachment; filename="data.bin"',
  )
  expect(res.headers.get("content-length")).toBe(
    buffer.byteLength.toString(),
  )
})

test("download returns 404 for missing file (query param form)", async () => {
  const { axios } = await getTestServer()

  await expect(
    axios.get("/files/download", {
      params: { file_path: "/does-not-exist.txt" },
    }),
  ).rejects.toMatchObject({ status: 404 })
})

test("download text file via path segment", async () => {
  const { axios } = await getTestServer()

  await axios.post("/files/upsert", {
    file_path: "/reports/summary.txt",
    text_content: "quarterly summary",
  })

  const res = await axios.get("/files/download/reports/summary.txt")

  expect(res.status).toBe(200)
  expect(res.data).toBe("quarterly summary")
  expect(res.headers.get("content-type")).toBe("text/plain")
  expect(res.headers.get("content-disposition")).toBe(
    'attachment; filename="summary.txt"',
  )
})

test("download binary file via path segment", async () => {
  const { axios } = await getTestServer()

  const buffer = Buffer.from([0x01, 0x02, 0x03, 0x04, 0xff])
  await axios.post("/files/upsert", {
    file_path: "/images/icon.png",
    binary_content_b64: buffer.toString("base64"),
  })

  const res = await axios.get("/files/download/images/icon.png", {
    responseType: "arrayBuffer",
  })

  expect(res.status).toBe(200)
  expect(Buffer.from(res.data)).toEqual(buffer)
  expect(res.headers.get("content-type")).toBe("application/octet-stream")
  expect(res.headers.get("content-disposition")).toBe(
    'attachment; filename="icon.png"',
  )
})

test("download returns 404 for missing file (path segment form)", async () => {
  const { axios } = await getTestServer()

  await expect(
    axios.get("/files/download/no/such/file.txt"),
  ).rejects.toMatchObject({ status: 404 })
})

test("download deeply nested path via path segment", async () => {
  const { axios } = await getTestServer()

  await axios.post("/files/upsert", {
    file_path: "/a/b/c/deep.txt",
    text_content: "deep content",
  })

  const res = await axios.get("/files/download/a/b/c/deep.txt")

  expect(res.status).toBe(200)
  expect(res.data).toBe("deep content")
  expect(res.headers.get("content-disposition")).toBe(
    'attachment; filename="deep.txt"',
  )
})
