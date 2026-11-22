import { test, expect } from "bun:test"
import { getTestServer } from "tests/fixtures/get-test-server"
import { getAttachmentContentDisposition } from "lib/utils/content-disposition"
import { Buffer } from "node:buffer"

test("content-disposition helper keeps plain ASCII names unchanged", () => {
  expect(getAttachmentContentDisposition("download-test.txt")).toBe(
    'attachment; filename="download-test.txt"',
  )
  expect(getAttachmentContentDisposition("/some/dir/report-2026.pdf")).toBe(
    'attachment; filename="report-2026.pdf"',
  )
})

test("content-disposition helper adds RFC 5987 filename* for non-ASCII names", () => {
  expect(getAttachmentContentDisposition("报告-2026.txt")).toBe(
    `attachment; filename="__-2026.txt"; filename*=UTF-8''%E6%8A%A5%E5%91%8A-2026.txt`,
  )
})

test("content-disposition helper sanitizes quotes in the fallback", () => {
  expect(getAttachmentContentDisposition('my "quoted".txt')).toBe(
    `attachment; filename="my _quoted_.txt"; filename*=UTF-8''my%20%22quoted%22.txt`,
  )
})

test("content-disposition helper falls back to a plain name when empty", () => {
  expect(getAttachmentContentDisposition("")).toBe(
    `attachment; filename="file"`,
  )
})

test("downloading a file with a non-ASCII name returns it instead of throwing", async () => {
  const { axios } = await getTestServer()

  await axios.post("/files/upsert", {
    file_path: "/报告-2026.txt",
    text_content: "Non-ASCII filename content",
  })

  // Query-param download form
  const queryRes = await axios.get("/files/download", {
    params: { file_path: "/报告-2026.txt" },
  })
  expect(queryRes.status).toBe(200)
  expect(queryRes.data).toBe("Non-ASCII filename content")
  expect(queryRes.headers.get("content-disposition")).toBe(
    `attachment; filename="__-2026.txt"; filename*=UTF-8''%E6%8A%A5%E5%91%8A-2026.txt`,
  )

  // Path-param download form
  const pathRes = await axios.get(
    `/files/download/${encodeURI("报告-2026.txt")}`,
  )
  expect(pathRes.status).toBe(200)
  expect(pathRes.data).toBe("Non-ASCII filename content")
  expect(pathRes.headers.get("content-disposition")).toBe(
    `attachment; filename="__-2026.txt"; filename*=UTF-8''%E6%8A%A5%E5%91%8A-2026.txt`,
  )
})

test("downloading a binary file with a quoted name keeps a valid header", async () => {
  const { axios } = await getTestServer()

  const buffer = Buffer.from([0, 1, 2, 3, 128, 255, 200])
  await axios.post("/files/upsert", {
    file_path: '/my "quoted".bin',
    binary_content_b64: buffer.toString("base64"),
  })

  const downloadRes = await axios.get("/files/download", {
    params: { file_path: '/my "quoted".bin' },
    responseType: "arrayBuffer",
  })
  expect(downloadRes.status).toBe(200)
  expect(Buffer.from(downloadRes.data)).toEqual(buffer)
  expect(downloadRes.headers.get("content-type")).toBe(
    "application/octet-stream",
  )
  expect(downloadRes.headers.get("content-disposition")).toBe(
    `attachment; filename="my _quoted_.bin"; filename*=UTF-8''my%20%22quoted%22.bin`,
  )
})
