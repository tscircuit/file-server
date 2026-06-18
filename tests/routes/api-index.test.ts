import { test, expect } from "bun:test"
import { getTestServer } from "tests/fixtures/get-test-server"

test("API index documents file download routes", async () => {
  const { axios } = await getTestServer()
  const res = await axios.get("/")
  const html = res.data as string

  expect(html).toContain("/files/download?file_path=...")
  expect(html).toContain("/files/download/path/to/file.txt")
})
