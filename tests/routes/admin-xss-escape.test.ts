import { expect, test } from "bun:test"
import { getTestServer } from "tests/fixtures/get-test-server"

// The admin dashboards interpolate user-writable strings (file paths written
// through the unauthenticated /files/upsert route, plus initiator-provided
// event fields) directly into HTML. Before the escapeHtml hardening, a
// file_path like /<script>alert(1)</script> executed in the browser of anyone
// opening /admin, /admin/files/list, /admin/files/get or /admin/events/list.

test("admin pages HTML-escape user-controlled file paths", async () => {
  const { axios } = await getTestServer()

  const payload = "<script>alert(1)</script>"
  await axios.post("/files/upsert", {
    file_path: `/${payload}/poc.html`,
    text_content: "ignored",
  })

  // admin files list
  const listPage = await axios.get("/admin/files/list")
  const listHtml = listPage.data as string
  expect(listHtml).not.toContain(payload)
  // normalizePath trims the leading slash, escapeHtml does the rest
  expect(listHtml).toContain("&lt;script&gt;alert(1)&lt;/script&gt;/poc.html")

  // admin file details
  const escapedPath = `/${payload}/poc.html`
  const detailPage = await axios.get("/admin/files/get", {
    params: { file_path: escapedPath },
  })
  const detailHtml = detailPage.data as string
  expect(detailHtml).not.toContain(payload)
  expect(detailHtml).toContain("&lt;script&gt;alert(1)")
})

test("admin events page HTML-escapes user-provided initiator payload", async () => {
  const { axios } = await getTestServer()

  await axios.post("/files/upsert", {
    file_path: "/events-poc.txt",
    text_content: "hi",
    initiator: '<img src=x onerror=alert(2)>".x=',
  })

  const eventsPage = await axios.get("/admin/events/list")
  const eventsHtml = eventsPage.data as string
  expect(eventsHtml).not.toContain("<img src=x")
  // escaped payload is visible as text only
  expect(eventsHtml).toContain("&lt;img src=x")
})

test("admin pages still render normal file data", async () => {
  const { axios } = await getTestServer()

  await axios.post("/files/upsert", {
    file_path: "/clean/dir/file.txt",
    text_content: "cleanfilecontent",
  })

  const listPage = await axios.get("/admin/files/list")
  const listData = listPage.data as string
  // upsert normalizes away the leading slash
  expect(listData).toContain("/clean/dir/file.txt".replace(/^\//, ""))

  const detailPage = await axios.get("/admin/files/get", {
    params: { file_path: "/clean/dir/file.txt" },
  })
  const detailHtml = detailPage.data as string
  expect(detailHtml).toContain("/clean/dir/file.txt".replace(/^\//, ""))
  expect(detailHtml).toContain("./list")
})
