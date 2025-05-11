import { test, expect } from "bun:test"
import { getTestServer } from "tests/fixtures/get-test-server"

test("file operations", async () => {
  const { axios } = await getTestServer()

  // Create a file
  const createRes = await axios.post("/files/upsert", {
    file_path: "/test.txt",
    text_content: "Hello World",
  })
  expect(createRes.data.file.file_path).toBe("test.txt")
  expect(createRes.data.file.text_content).toBe("Hello World")

  // Get the file
  const getRes = await axios.get("/files/get", {
    params: { file_path: "/test.txt" },
  })
  expect(getRes.data.file.text_content).toBe("Hello World")

  // List files
  const listRes = await axios.get("/files/list")
  expect(listRes.data.file_list).toHaveLength(1)
  expect(listRes.data.file_list[0].file_path).toBe("test.txt")

  // Check events
  const eventsRes = await axios.get("/events/list")
  expect(eventsRes.data.event_list).toHaveLength(1)
  expect(eventsRes.data.event_list[0].event_type).toBe("FILE_UPDATED")
  expect(eventsRes.data.event_list[0].file_path).toBe("test.txt")
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

test("file delete operations", async () => {
  const { axios } = await getTestServer()

  const createResPath = await axios.post("/files/upsert", {
    file_path: "/delete-by-path.txt",
    text_content: "Delete me by path",
  })
  const filePathToDelete = createResPath.data.file.file_path

  const deleteResPath = await axios.post("/files/delete", {
    file_path: filePathToDelete,
    initiator: "test-path-delete",
  })
  expect(deleteResPath.status).toBe(204)

  let listRes = await axios.get("/files/list")
  expect(
    listRes.data.file_list.find((f: any) => f.file_path === filePathToDelete),
  ).toBeUndefined()

  let eventsRes = await axios.get("/events/list")
  const deleteEventPath = eventsRes.data.event_list.find(
    (e: any) =>
      e.event_type === "FILE_DELETED" && e.file_path === filePathToDelete,
  )
  expect(deleteEventPath).toBeDefined()
  expect(deleteEventPath.initiator).toBe("test-path-delete")

  const createResId = await axios.post("/files/upsert", {
    file_path: "/delete-by-id.txt",
    text_content: "Delete me by id",
  })
  const fileIdToDelete = createResId.data.file.file_id
  const filePathById = createResId.data.file.file_path

  const deleteResId = await axios.post("/files/delete", {
    file_id: fileIdToDelete,
  })
  expect(deleteResId.status).toBe(204)

  listRes = await axios.get("/files/list")
  expect(
    listRes.data.file_list.find((f: any) => f.file_id === fileIdToDelete),
  ).toBeUndefined()

  eventsRes = await axios.get("/events/list")
  const deleteEventId = eventsRes.data.event_list.find(
    (e: any) => e.event_type === "FILE_DELETED" && e.file_path === filePathById,
  )
  expect(deleteEventId).toBeDefined()
  expect(deleteEventId.file_path).toBe(filePathById)

  expect(
    axios.delete("/files/delete", {
      data: {
        file_path: "/non-existent-path.txt",
      },
    }),
  ).rejects.toMatchObject({
    status: 404,
    data: { error: "File not found" },
  })

  expect(
    axios.post("/files/delete", {
      file_id: "non-existent-id",
    }),
  ).rejects.toMatchObject({
    status: 404,
    data: { error: "File not found" },
  })

  expect(axios.delete("/files/delete", { data: {} })).rejects.toMatchObject({
    status: 400,
  })
})

test("file rename operations", async () => {
  const { axios } = await getTestServer()

  const createRes = await axios.post("/files/upsert", {
    file_path: "/original.txt",
    text_content: "Original content",
  })
  const originalFile = createRes.data.file

  const renameRes = await axios.post("/files/rename", {
    old_file_path: "/original.txt",
    new_file_path: "/renamed.txt",
    initiator: "test-rename",
  })
  expect(renameRes.status).toBe(200)
  expect(renameRes.data.file.file_path).toBe("renamed.txt")
  expect(renameRes.data.file.text_content).toBe("Original content")
  expect(renameRes.data.file.file_id).toBe(originalFile.file_id)

  const getOldRes = await axios.get("/files/get", {
    params: { file_path: "/original.txt" },
  })
  expect(getOldRes.data.file).toBeNull()

  const getNewRes = await axios.get("/files/get", {
    params: { file_path: "/renamed.txt" },
  })
  expect(getNewRes.data.file.text_content).toBe("Original content")

  const eventsRes = await axios.get("/events/list")
  const createdEvent = eventsRes.data.event_list.find(
    (e: any) =>
      e.event_type === "FILE_CREATED" && e.file_path === "renamed.txt",
  )
  expect(createdEvent).toBeDefined()
  expect(createdEvent.initiator).toBe("test-rename")

  const deletedEvent = eventsRes.data.event_list.find(
    (e: any) =>
      e.event_type === "FILE_DELETED" && e.file_path === "original.txt",
  )
  expect(deletedEvent).toBeDefined()
  expect(deletedEvent.initiator).toBe("test-rename")

  // Test error cases
  // Try to rename non-existent file
  await expect(
    axios.post("/files/rename", {
      old_file_path: "/non-existent.txt",
      new_file_path: "/new.txt",
    }),
  ).rejects.toMatchObject({
    status: 404,
    data: { file: null },
  })

  // Try to rename to existing file
  await axios.post("/files/upsert", {
    file_path: "/existing.txt",
    text_content: "Existing file",
  })

  await expect(
    axios.post("/files/rename", {
      old_file_path: "/renamed.txt",
      new_file_path: "/existing.txt",
    }),
  ).rejects.toMatchObject({
    status: 409,
    data: { file: null },
  })
})
