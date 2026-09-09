import { expect, test } from "bun:test"
import { getTestServer } from "tests/fixtures/get-test-server"

test("empty and root paths are rejected for upsert and rename", async () => {
  const { axios } = await getTestServer()

  for (const badPath of ["", "/"]) {
    let upsertStatus: number | undefined
    try {
      await axios.post("/files/upsert", {
        file_path: badPath,
        text_content: "should not exist",
      })
    } catch (err: any) {
      upsertStatus = err?.status ?? err?.response?.status
    }
    expect(upsertStatus).toBe(400)
  }

  await axios.post("/files/upsert", {
    file_path: "keeper.txt",
    text_content: "keep me",
  })

  let renameStatus: number | undefined
  for (const badNewPath of ["", "/"]) {
    renameStatus = undefined
    try {
      await axios.post("/files/rename", {
        old_file_path: "keeper.txt",
        new_file_path: badNewPath,
      })
    } catch (err: any) {
      renameStatus = err?.status ?? err?.response?.status
    }
    expect(renameStatus).toBe(400)
  }

  const kept = await axios.get("/files/get", {
    params: { file_path: "keeper.txt" },
  })
  expect(kept.data.file?.text_content).toBe("keep me")
})
