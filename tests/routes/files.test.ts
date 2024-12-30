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
