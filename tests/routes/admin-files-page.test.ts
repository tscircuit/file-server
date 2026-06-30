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

test("admin file pages escape untrusted file paths", async () => {
  const { axios } = await getTestServer()

  const maliciousPath = '/"><script>alert(1)</script>.txt'

  await axios.post("/files/upsert", {
    file_path: maliciousPath,
    text_content: '<img src=x onerror="alert(2)">',
  })

  const listRes = await axios.get("/admin/files/list")
  const listHtml = listRes.data as string

  expect(listHtml).toContain(
    "&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;.txt",
  )
  expect(listHtml).not.toContain("<script>alert(1)</script>")

  const detailsRes = await axios.get("/admin/files/get", {
    params: { file_path: maliciousPath },
  })
  const detailsHtml = detailsRes.data as string

  expect(detailsHtml).toContain(
    "&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;.txt",
  )
  expect(detailsHtml).toContain(
    "&lt;img src=x onerror=&quot;alert(2)&quot;&gt;",
  )
  expect(detailsHtml).not.toContain("<script>alert(1)</script>")
  expect(detailsHtml).not.toContain('<img src=x onerror="alert(2)">')
})
