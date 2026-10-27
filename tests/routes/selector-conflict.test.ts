import { test, expect } from "bun:test"
import { getTestServer } from "tests/fixtures/get-test-server"

test("a conflicting delete selector cannot remove two files", async () => {
  const { axios } = await getTestServer()
  const first = await axios.post("/files/upsert", {
    file_path: "first.txt",
    text_content: "first",
  })
  await axios.post("/files/upsert", {
    file_path: "second.txt",
    text_content: "second",
  })
  await expect(
    axios.post("/files/delete", {
      file_id: first.data.file.file_id,
      file_path: "second.txt",
    }),
  ).rejects.toMatchObject({ status: 400 })
  expect((await axios.get("/files/list")).data.file_list).toHaveLength(2)
  expect((await axios.get("/events/list")).data.event_list).toHaveLength(2)
})
