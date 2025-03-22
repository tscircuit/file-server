import { test, expect } from "bun:test"
import { getTestServer } from "tests/fixtures/get-test-server"

test("file operations", async () => {
  const { axios } = await getTestServer()

  // Create a file
  const createRes = await axios.post("/files/upsert", {
    file_path: "/test.txt",
    text_content: "Hello World",
  })
  expect(createRes.data.file.file_path).toBe("/test.txt")
  expect(createRes.data.file.text_content).toBe("Hello World")

  // Get the file
  const getRes = await axios.get("/files/get", {
    params: { file_path: "/test.txt" },
  })
  expect(getRes.data.file.text_content).toBe("Hello World")

  // List files
  const listRes = await axios.get("/files/list")
  expect(listRes.data.file_list).toHaveLength(1)
  expect(listRes.data.file_list[0].file_path).toBe("/test.txt")

  // Check events
  const eventsRes = await axios.get("/events/list")
  expect(eventsRes.data.event_list).toHaveLength(1)
  expect(eventsRes.data.event_list[0].event_type).toBe("FILE_UPDATED")
  expect(eventsRes.data.event_list[0].file_path).toBe("/test.txt")
})

test("file download operations", async () => {
  const { axios } = await getTestServer()

  await axios.post("/files/upsert", {
    file_path: "/download-test.txt",
    text_content: "Test download content",
  })

  const successRes = await axios.get("/files/download", {
    params: { file_path: "/download-test.txt" },
  })
  expect(successRes.status).toBe(200)
  expect(successRes.data).toBe("Test download content")
  expect(successRes.headers.get("content-type")).toBe("text/plain")
  expect(successRes.headers.get("content-disposition")).toBe(
    'attachment; filename="download-test.txt"',
  )

  expect(
    axios.get("/files/download", {
      params: { file_path: "/missing-file.txt" },
    }),
  ).rejects.toMatchObject({
    status: 404,
    data: "File not found",
  })
})

test("file download operations2", async () => {
  const { axios } = await getTestServer()

  await axios.post("/files/upsert", {
    file_path: "/download-test2.txt",
    text_content: "Test download content",
  })

  const successRes = await axios.get("/files/download/download-test2.txt")
  expect(successRes.status).toBe(200)
  expect(successRes.data).toBe("Test download content")
  expect(successRes.headers.get("content-type")).toBe("text/plain")
  expect(successRes.headers.get("content-disposition")).toBe(
    'attachment; filename="download-test2.txt"',
  )

  expect(axios.get("/files/download/missing-file.txt")).rejects.toMatchObject({
    status: 404,
    data: "File not found",
  })
})
