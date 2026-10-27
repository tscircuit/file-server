import { test, expect } from "bun:test"
import { getTestServer } from "tests/fixtures/get-test-server"

test("creating or renaming a file to the root is rejected", async () => {
  const { axios } = await getTestServer()
  for (const file_path of ["", "/"]) {
    await expect(
      axios.post("/files/upsert", {
        file_path,
        text_content: "unreachable",
      }),
    ).rejects.toMatchObject({ status: 400 })
  }
  await axios.post("/files/upsert", {
    file_path: "valid.txt",
    text_content: "retained",
  })
  await expect(
    axios.post("/files/rename", {
      old_file_path: "valid.txt",
      new_file_path: "/",
    }),
  ).rejects.toMatchObject({ status: 400 })
  expect(
    (
      await axios.get("/files/get", {
        params: { file_path: "valid.txt" },
      })
    ).data.file.text_content,
  ).toBe("retained")
})
