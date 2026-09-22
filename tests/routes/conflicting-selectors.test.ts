import { expect, test } from "bun:test"
import { getTestServer } from "tests/fixtures/get-test-server"

test("rejects conflicting file selectors", async () => {
  const { axios } = await getTestServer()

  const first = await axios.post("/files/upsert", {
    file_path: "/first-selector.txt",
    text_content: "first",
  })
  await axios.post("/files/upsert", {
    file_path: "/second-selector.txt",
    text_content: "second",
  })

  const params = {
    file_id: first.data.file.file_id,
    file_path: "/second-selector.txt",
  }

  await expect(axios.get("/files/get", { params })).rejects.toMatchObject({
    status: 400,
    data: { file: null },
  })

  await expect(axios.get("/files/download", { params })).rejects.toMatchObject({
    status: 400,
    data: "Provide only one of file_id or file_path",
  })
})
