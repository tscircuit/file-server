import { test, expect } from "bun:test"
import { getTestServer } from "tests/fixtures/get-test-server"

test("admin file page shows download and static links", async () => {
  const { ky } = await getTestServer()

  await ky.post("files/upsert", {
    json: {
      file_path: "/admin-link-test.txt",
      text_content: "hello",
    },
  })

  const html = await ky
    .get("admin/files/get", {
      searchParams: { file_path: "/admin-link-test.txt" },
    })
    .text()

  expect(html).toContain(
    'href="../../files/download?file_path=/admin-link-test.txt"',
  )
  expect(html).toContain('href="../../files/static/admin-link-test.txt"')
})
