import { test, expect } from "bun:test"
import { getTestServer } from "tests/fixtures/get-test-server"

test("download by file_id", async () => {
  const { axios } = await getTestServer()

  const upsertRes = await axios.post("/files/upsert", {
    file_path: "/by-id.txt",
    text_content: "Downloaded by id",
  })
  const fileId = upsertRes.data.file.file_id

  const downloadRes = await axios.get("/files/download", {
    params: { file_id: fileId },
  })
  expect(downloadRes.status).toBe(200)
  expect(downloadRes.data).toBe("Downloaded by id")
  expect(downloadRes.headers.get("content-disposition")).toBe(
    'attachment; filename="by-id.txt"',
  )
})

test("download nested path via path form", async () => {
  const { axios } = await getTestServer()

  await axios.post("/files/upsert", {
    file_path: "/nested/dir/file.txt",
    text_content: "Nested content",
  })

  const downloadRes = await axios.get("/files/download/nested/dir/file.txt")
  expect(downloadRes.status).toBe(200)
  expect(downloadRes.data).toBe("Nested content")
  expect(downloadRes.headers.get("content-disposition")).toBe(
    'attachment; filename="file.txt"',
  )
})

test("nested path form returns 404 for missing file", async () => {
  const { axios } = await getTestServer()

  expect(
    axios.get("/files/download/some/missing/file.txt"),
  ).rejects.toMatchObject({
    status: 404,
    data: "File not found",
  })
})

test("index page lists download endpoints", async () => {
  const { axios } = await getTestServer()

  const indexRes = await axios.get("/")
  expect(indexRes.status).toBe(200)
  expect(indexRes.data).toContain("/files/download")
})
