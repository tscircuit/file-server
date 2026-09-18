import { test, expect } from "bun:test"
import { getTestServer } from "tests/fixtures/get-test-server"
import { Buffer } from "node:buffer"

test("download file with spaces in filename", async () => {
  const { axios } = await getTestServer()

  await axios.post("/files/upsert", {
    file_path: "/sub folder/my test document.txt",
    text_content: "Document content with spaces",
  })

  // Query parameter style
  const queryRes = await axios.get("/files/download", {
    params: { file_path: "/sub folder/my test document.txt" },
  })
  expect(queryRes.status).toBe(200)
  expect(queryRes.data).toBe("Document content with spaces")
  expect(queryRes.headers.get("content-type")).toBe("text/plain")
  const queryDisposition = queryRes.headers.get("content-disposition")
  expect(queryDisposition).toBe('attachment; filename="my test document.txt"')

  // Path parameter style
  const pathRes = await axios.get(
    "/files/download/sub folder/my test document.txt",
  )
  expect(pathRes.status).toBe(200)
  expect(pathRes.data).toBe("Document content with spaces")
  expect(pathRes.headers.get("content-type")).toBe("text/plain")
  const pathDisposition = pathRes.headers.get("content-disposition")
  expect(pathDisposition).toBe('attachment; filename="my test document.txt"')
})

test("download empty binary file", async () => {
  const { axios } = await getTestServer()

  const upsertRes = await axios.post("/files/upsert", {
    file_path: "/empty.bin",
    binary_content_b64: "",
  })
  expect(upsertRes.status).toBe(200)
  const fileId = upsertRes.data.file.file_id

  const resByPath = await axios.get("/files/download", {
    params: { file_path: "/empty.bin" },
    responseType: "arrayBuffer",
  })
  expect(resByPath.status).toBe(200)
  expect(resByPath.headers.get("content-type")).toBe("application/octet-stream")
  expect(resByPath.headers.get("content-length")).toBe("0")
  expect(Buffer.from(resByPath.data).byteLength).toBe(0)

  const resById = await axios.get("/files/download", {
    params: { file_id: fileId },
    responseType: "arrayBuffer",
  })
  expect(resById.status).toBe(200)
  expect(resById.headers.get("content-type")).toBe("application/octet-stream")
  expect(resById.headers.get("content-length")).toBe("0")
})

test("download non-existent file returns 404", async () => {
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
