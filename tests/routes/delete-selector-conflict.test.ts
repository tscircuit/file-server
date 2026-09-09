import { expect, test } from "bun:test"
import { getTestServer } from "tests/fixtures/get-test-server"

test("delete with mismatched id and path does not remove multiple files", async () => {
  const { axios } = await getTestServer()

  const alpha = await axios.post("/files/upsert", {
    file_path: "alpha.txt",
    text_content: "alpha",
  })
  await axios.post("/files/upsert", {
    file_path: "beta.txt",
    text_content: "beta",
  })

  const eventsBefore = (await axios.get("/events/list")).data.event_list.length

  // The id points at alpha.txt while the path points at beta.txt.
  // This must be rejected instead of deleting both files.
  let status: number | undefined
  try {
    await axios.post("/files/delete", {
      file_id: alpha.data.file.file_id,
      file_path: "beta.txt",
    })
  } catch (err: any) {
    status = err?.status ?? err?.response?.status
  }

  expect(status).toBe(400)

  const remaining = (await axios.get("/files/list")).data.file_list
  expect(remaining).toHaveLength(2)

  const eventsAfter = (await axios.get("/events/list")).data.event_list
  expect(eventsAfter).toHaveLength(eventsBefore)
})
