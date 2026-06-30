import { test, expect } from "bun:test"
import { getTestServer } from "tests/fixtures/get-test-server"

test("admin events page escapes untrusted event values", async () => {
  const { axios } = await getTestServer()

  await axios.post("/events/create", {
    event_type: 'USER_LOGIN"><script>alert(1)</script>',
    file_path: '/"><img src=x onerror="alert(2)">.txt',
    initiator: '<svg onload="alert(3)">',
  })

  const res = await axios.get("/admin/events/list")
  const html = res.data as string

  expect(html).toContain(
    "USER_LOGIN&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;",
  )
  expect(html).toContain(
    "file_path:&quot;/\\&quot;&gt;&lt;img src=x onerror=\\&quot;alert(2)\\&quot;&gt;.txt&quot;",
  )
  expect(html).toContain(
    "initiator:&quot;&lt;svg onload=\\&quot;alert(3)\\&quot;&gt;&quot;",
  )
  expect(html).not.toContain("<script>alert(1)</script>")
  expect(html).not.toContain('<img src=x onerror="alert(2)">')
  expect(html).not.toContain('<svg onload="alert(3)">')
})
