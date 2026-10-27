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

test("admin pages escape HTML in file_path and event details and static route sandboxes active content", async () => {
  const { axios } = await getTestServer()

  const maliciousPath = "/<img src=x onerror=alert(1)>.html"
  await axios.post("/files/upsert", {
    file_path: maliciousPath,
    text_content: "<script>alert(1)</script>",
  })

  const filesListRes = await axios.get("/admin/files/list")
  expect(filesListRes.data as string).not.toContain("<img src=x")
  expect(filesListRes.data as string).toContain(
    "&lt;img src=x onerror=alert(1)&gt;.html",
  )

  const fileGetRes = await axios.get("/admin/files/get", {
    params: { file_path: maliciousPath },
  })
  expect(fileGetRes.data as string).not.toContain("<img src=x")
  expect(fileGetRes.data as string).not.toContain("<script>alert(1)</script>")

  await axios.post("/events/create", {
    event_type: "<script>alert(2)</script>",
    payload: "<img src=y onerror=alert(3)>",
  })
  const eventsListRes = await axios.get("/admin/events/list")
  expect(eventsListRes.data as string).not.toContain(
    "<script>alert(2)</script>",
  )
  expect(eventsListRes.data as string).not.toContain("<img src=y")

  await axios.post("/files/upsert", {
    file_path: "/poc.html",
    text_content: "<script>alert(1)</script>",
  })
  const staticRes = await axios.get("/files/static/poc.html")
  expect(staticRes.headers.get("content-security-policy")).toBe("sandbox")
  expect(staticRes.headers.get("x-content-type-options")).toBe("nosniff")
})
