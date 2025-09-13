import { test, expect } from "bun:test"
import { getTestServer } from "tests/fixtures/get-test-server"

test("admin file page shows download and static links", async () => {
  const { axios } = await getTestServer()

  await axios.post("/files/upsert", {
    file_path: "/admin-link-test.txt",
    text_content: "hello",
  })

  const res = await axios.get("/admin/files/get", {
    params: { file_path: "/admin-link-test.txt" },
  })

  const html = res.data as string
  expect(html).toContain(
    'href="../../files/download?file_path=/admin-link-test.txt"',
  )
  expect(html).toContain('href="../../files/static/admin-link-test.txt"')
})
