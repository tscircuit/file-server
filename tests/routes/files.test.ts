import { test, expect } from "bun:test"
import { getTestServer } from "tests/fixtures/get-test-server"
import { Buffer } from "node:buffer"

test("file operations", async () => {
  const { ky } = await getTestServer()

  const createData = await ky
    .post("files/upsert", {
      json: {
        file_path: "/test.txt",
        text_content: "Hello World",
      },
    })
    .json<{ file: { file_path: string; text_content: string } }>()
  expect(createData.file.file_path).toBe("test.txt")
  expect(createData.file.text_content).toBe("Hello World")

  const getData = await ky
    .get("files/get", {
      searchParams: { file_path: "/test.txt" },
    })
    .json<{ file: { text_content: string } }>()
  expect(getData.file.text_content).toBe("Hello World")

  const listData = await ky.get("files/list").json<{ file_list: any[] }>()
  expect(listData.file_list).toHaveLength(1)
  expect(listData.file_list[0].file_path).toBe("test.txt")

  const eventsData = await ky.get("events/list").json<{ event_list: any[] }>()
  expect(eventsData.event_list).toHaveLength(1)
  expect(eventsData.event_list[0].event_type).toBe("FILE_UPDATED")
  expect(eventsData.event_list[0].file_path).toBe("test.txt")
})

test("binary file operations", async () => {
  const { ky } = await getTestServer()

  const buffer = Buffer.from([0, 1, 2, 3, 128, 255, 200])
  const base64 = buffer.toString("base64")

  const createData = await ky
    .post("files/upsert", {
      json: {
        file_path: "/bin.dat",
        binary_content_b64: base64,
      },
    })
    .json<{ file: { binary_content_b64: string } }>()
  expect(createData.file.binary_content_b64).toBe(base64)

  const getData = await ky
    .get("files/get", {
      searchParams: { file_path: "/bin.dat" },
    })
    .json<{ file: { binary_content_b64: string } }>()
  expect(getData.file.binary_content_b64).toBe(base64)

  const downloadRes = await ky.get("files/download", {
    searchParams: { file_path: "/bin.dat" },
  })
  expect(downloadRes.status).toBe(200)
  expect(Buffer.from(await downloadRes.arrayBuffer())).toEqual(buffer)
  expect(downloadRes.headers.get("content-type")).toBe(
    "application/octet-stream",
  )
  expect(downloadRes.headers.get("content-length")).toBe(
    buffer.length.toString(),
  )
})

test("file download operations", async () => {
  const { ky } = await getTestServer()

  await ky.post("files/upsert", {
    json: {
      file_path: "/download-test.txt",
      text_content: "Test download content",
    },
  })

  const successRes = await ky.get("files/download", {
    searchParams: { file_path: "/download-test.txt" },
  })
  expect(successRes.status).toBe(200)
  expect(await successRes.text()).toBe("Test download content")
  expect(successRes.headers.get("content-type")).toBe("text/plain")
  expect(successRes.headers.get("content-disposition")).toBe(
    'attachment; filename="download-test.txt"',
  )

  const missingRes = await ky.get("files/download", {
    searchParams: { file_path: "/missing-file.txt" },
  })
  expect(missingRes.status).toBe(404)
  expect(await missingRes.text()).toBe("File not found")
})

test("file path download operations", async () => {
  const { ky } = await getTestServer()

  await ky.post("files/upsert", {
    json: {
      file_path: "/download-test2.txt",
      text_content: "Test download content",
    },
  })

  const successRes = await ky.get("files/download/download-test2.txt")
  expect(successRes.status).toBe(200)
  expect(await successRes.text()).toBe("Test download content")
  expect(successRes.headers.get("content-type")).toBe("text/plain")
  expect(successRes.headers.get("content-disposition")).toBe(
    'attachment; filename="download-test2.txt"',
  )

  const missingRes = await ky.get("files/download/missing-file.txt")
  expect(missingRes.status).toBe(404)
  expect(await missingRes.text()).toBe("File not found")
})

test("file delete operations", async () => {
  const { ky } = await getTestServer()

  const createByPathData = await ky
    .post("files/upsert", {
      json: {
        file_path: "/delete-by-path.txt",
        text_content: "Delete me by path",
      },
    })
    .json<{ file: { file_path: string } }>()
  const filePathToDelete = createByPathData.file.file_path

  const deleteResPath = await ky.post("files/delete", {
    json: {
      file_path: filePathToDelete,
      initiator: "test-path-delete",
    },
  })
  expect(deleteResPath.status).toBe(204)

  let listData = await ky.get("files/list").json<{ file_list: any[] }>()
  expect(
    listData.file_list.find((f: any) => f.file_path === filePathToDelete),
  ).toBeUndefined()

  let eventsData = await ky.get("events/list").json<{ event_list: any[] }>()
  const deleteEventPath = eventsData.event_list.find(
    (e: any) =>
      e.event_type === "FILE_DELETED" && e.file_path === filePathToDelete,
  )
  expect(deleteEventPath).toBeDefined()
  expect(deleteEventPath.initiator).toBe("test-path-delete")

  const createByIdData = await ky
    .post("files/upsert", {
      json: {
        file_path: "/delete-by-id.txt",
        text_content: "Delete me by id",
      },
    })
    .json<{ file: { file_id: string; file_path: string } }>()
  const fileIdToDelete = createByIdData.file.file_id
  const filePathById = createByIdData.file.file_path

  const deleteResId = await ky.post("files/delete", {
    json: {
      file_id: fileIdToDelete,
    },
  })
  expect(deleteResId.status).toBe(204)

  listData = await ky.get("files/list").json<{ file_list: any[] }>()
  expect(
    listData.file_list.find((f: any) => f.file_id === fileIdToDelete),
  ).toBeUndefined()

  eventsData = await ky.get("events/list").json<{ event_list: any[] }>()
  const deleteEventId = eventsData.event_list.find(
    (e: any) => e.event_type === "FILE_DELETED" && e.file_path === filePathById,
  )
  expect(deleteEventId).toBeDefined()
  expect(deleteEventId.file_path).toBe(filePathById)

  const missingPathRes = await ky.delete("files/delete", {
    json: {
      file_path: "/non-existent-path.txt",
    },
  })
  expect(missingPathRes.status).toBe(404)
  expect(await missingPathRes.json<any>()).toEqual({ error: "File not found" })

  const missingIdRes = await ky.post("files/delete", {
    json: {
      file_id: "non-existent-id",
    },
  })
  expect(missingIdRes.status).toBe(404)
  expect(await missingIdRes.json<any>()).toEqual({ error: "File not found" })

  const badDeleteRes = await ky.delete("files/delete", { json: {} })
  expect(badDeleteRes.status).toBe(400)
})

test("file rename operations", async () => {
  const { ky } = await getTestServer()

  const createData = await ky
    .post("files/upsert", {
      json: {
        file_path: "/original.txt",
        text_content: "Original content",
      },
    })
    .json<{ file: { file_id: string } }>()
  const originalFile = createData.file

  const renameRes = await ky.post("files/rename", {
    json: {
      old_file_path: "/original.txt",
      new_file_path: "/renamed.txt",
      initiator: "test-rename",
    },
  })
  expect(renameRes.status).toBe(200)
  const renameData = await renameRes.json<any>()
  expect(renameData.file.file_path).toBe("renamed.txt")
  expect(renameData.file.text_content).toBe("Original content")
  expect(renameData.file.file_id).toBe(originalFile.file_id)

  const getOldData = await ky
    .get("files/get", {
      searchParams: { file_path: "/original.txt" },
    })
    .json<{ file: null }>()
  expect(getOldData.file).toBeNull()

  const getNewData = await ky
    .get("files/get", {
      searchParams: { file_path: "/renamed.txt" },
    })
    .json<{ file: { text_content: string } }>()
  expect(getNewData.file.text_content).toBe("Original content")

  const eventsData = await ky.get("events/list").json<{ event_list: any[] }>()
  const createdEvent = eventsData.event_list.find(
    (e: any) => e.event_type === "FILE_CREATED" && e.file_path === "renamed.txt",
  )
  expect(createdEvent).toBeDefined()
  expect(createdEvent.initiator).toBe("test-rename")

  const deletedEvent = eventsData.event_list.find(
    (e: any) => e.event_type === "FILE_DELETED" && e.file_path === "original.txt",
  )
  expect(deletedEvent).toBeDefined()
  expect(deletedEvent.initiator).toBe("test-rename")

  const missingRenameRes = await ky.post("files/rename", {
    json: {
      old_file_path: "/non-existent.txt",
      new_file_path: "/new.txt",
    },
  })
  expect(missingRenameRes.status).toBe(404)
  expect(await missingRenameRes.json<any>()).toEqual({ file: null })

  await ky.post("files/upsert", {
    json: {
      file_path: "/existing.txt",
      text_content: "Existing file",
    },
  })

  const conflictRenameRes = await ky.post("files/rename", {
    json: {
      old_file_path: "/renamed.txt",
      new_file_path: "/existing.txt",
    },
  })
  expect(conflictRenameRes.status).toBe(409)
  expect(await conflictRenameRes.json<any>()).toEqual({ file: null })
})

test("file static serving operations", async () => {
  const { ky, url } = await getTestServer()

  const testFiles: Array<{
    path: string
    expectedMime: string
    content?: string
    binaryContent?: Buffer
  }> = [
    {
      path: "/test.html",
      content: "<html><body>Test</body></html>",
      expectedMime: "text/html",
    },
    {
      path: "/test.css",
      content: "body { color: red; }",
      expectedMime: "text/css",
    },
    {
      path: "/test.js",
      content: "console.log('test');",
      expectedMime: "text/javascript",
    },
    {
      path: "/test.json",
      content: '{"test": true}',
      expectedMime: "application/json",
    },
    {
      path: "/test.png",
      content: "fake png content",
      expectedMime: "image/png",
    },
    {
      path: "/test.jpg",
      content: "fake jpg content",
      expectedMime: "image/jpeg",
    },
    {
      path: "/test.unknown",
      content: "unknown file type",
      expectedMime: "application/octet-stream",
    },
    {
      path: "/example-dir2/myObj.obj",
      content: "fake obj content",
      expectedMime: "application/octet-stream",
    },
    {
      path: "/models/test.glb",
      binaryContent: Buffer.from([
        0x67, 0x6c, 0x54, 0x46, 0x02, 0x00, 0x00, 0x00, 0x1c, 0x00, 0x00,
        0x00, 0x4e, 0x4f, 0x44, 0x45, 0x00, 0x00, 0x00, 0x00, 0x80, 0xff,
        0xfe, 0xfd,
      ]),
      expectedMime: "model/gltf-binary",
    },
  ]

  for (const file of testFiles) {
    if (file.binaryContent) {
      await ky.post("files/upsert", {
        json: {
          file_path: file.path,
          binary_content_b64: file.binaryContent.toString("base64"),
        },
      })
    } else {
      await ky.post("files/upsert", {
        json: {
          file_path: file.path,
          text_content: file.content,
        },
      })
    }

    if (file.binaryContent) {
      const response = await fetch(`${url}/files/static${file.path}`)
      expect(response.status).toBe(200)
      const arrayBuffer = await response.arrayBuffer()
      const responseBytes = new Uint8Array(arrayBuffer)
      const expectedBytes = new Uint8Array(file.binaryContent)
      expect(Array.from(responseBytes)).toEqual(Array.from(expectedBytes))
      expect(response.headers.get("content-type")).toBe(file.expectedMime)
      expect(response.headers.get("content-disposition")).toBeNull()
      expect(response.headers.get("content-length")).toBe(
        file.binaryContent.byteLength.toString(),
      )
      continue
    }

    const response = await ky.get(`files/static${file.path}`)
    expect(response.status).toBe(200)

    if (file.expectedMime === "application/json") {
      expect(await response.json<any>()).toEqual(JSON.parse(file.content!))
    } else {
      expect(await response.text()).toBe(file.content!)
    }

    expect(response.headers.get("content-type")).toBe(file.expectedMime)
    expect(response.headers.get("content-disposition")).toBeNull()
  }

  const missingRes = await ky.get("files/static/missing-file.txt")
  expect(missingRes.status).toBe(404)
  expect(await missingRes.text()).toBe("File not found")
})
