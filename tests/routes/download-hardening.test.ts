import { test, expect } from "bun:test"
import { Buffer } from "node:buffer"
import { getTestServer } from "tests/fixtures/get-test-server"
import { formatDownloadContentDisposition } from "lib/utils/content-disposition"

test("download file with spaces in filename (query + path)", async () => {
  const { axios } = await getTestServer()

  await axios.post("/files/upsert", {
    file_path: "/sub folder/my test document.txt",
    text_content: "Document content with spaces",
  })

  const queryRes = await axios.get("/files/download", {
    params: { file_path: "/sub folder/my test document.txt" },
  })
  expect(queryRes.status).toBe(200)
  expect(queryRes.data).toBe("Document content with spaces")
  expect(queryRes.headers.get("content-type")).toBe("text/plain")
  expect(queryRes.headers.get("content-disposition")).toBe(
    'attachment; filename="my test document.txt"',
  )

  const pathRes = await axios.get(
    "/files/download/sub folder/my test document.txt",
  )
  expect(pathRes.status).toBe(200)
  expect(pathRes.data).toBe("Document content with spaces")
  expect(pathRes.headers.get("content-type")).toBe("text/plain")
  expect(pathRes.headers.get("content-disposition")).toBe(
    'attachment; filename="my test document.txt"',
  )
})

test("download empty (0-byte) binary file as octet-stream", async () => {
  const { axios } = await getTestServer()

  const upsertRes = await axios.post("/files/upsert", {
    file_path: "/empty.bin",
    binary_content_b64: "",
  })
  expect(upsertRes.status).toBe(200)
  const fileId = upsertRes.data.file.file_id

  const byPath = await axios.get("/files/download", {
    params: { file_path: "/empty.bin" },
    responseType: "arrayBuffer",
  })
  expect(byPath.status).toBe(200)
  expect(byPath.headers.get("content-type")).toBe("application/octet-stream")
  expect(byPath.headers.get("content-length")).toBe("0")
  expect(Buffer.from(byPath.data).byteLength).toBe(0)

  const byId = await axios.get("/files/download", {
    params: { file_id: fileId },
    responseType: "arrayBuffer",
  })
  expect(byId.status).toBe(200)
  expect(byId.headers.get("content-type")).toBe("application/octet-stream")
  expect(byId.headers.get("content-length")).toBe("0")
})

test("download non-existent file returns 404 (query + path)", async () => {
  const { axios } = await getTestServer()

  expect(
    axios.get("/files/download", {
      params: { file_path: "/nonexistent.txt" },
    }),
  ).rejects.toMatchObject({
    status: 404,
    data: "File not found",
  })

  expect(axios.get("/files/download/does/not/exist.txt")).rejects.toMatchObject(
    {
      status: 404,
      data: "File not found",
    },
  )
})

test("download filename with quotes is sanitized in Content-Disposition", async () => {
  const { axios } = await getTestServer()

  await axios.post("/files/upsert", {
    file_path: '/evil";x="y.txt',
    text_content: "quoted filename",
  })

  const res = await axios.get("/files/download", {
    params: { file_path: '/evil";x="y.txt' },
  })
  expect(res.status).toBe(200)
  expect(res.data).toBe("quoted filename")
  expect(res.headers.get("content-disposition")).toBe(
    'attachment; filename="evil_;x=_y.txt"',
  )
})

test("formatDownloadContentDisposition sanitizes control characters", () => {
  expect(formatDownloadContentDisposition("/a/b/file.txt")).toBe(
    'attachment; filename="file.txt"',
  )
  expect(formatDownloadContentDisposition('/a/"weird"\nname.txt')).toBe(
    'attachment; filename="_weird__name.txt"',
  )
  expect(formatDownloadContentDisposition("/a/b/")).toBe(
    'attachment; filename=""',
  )
})
