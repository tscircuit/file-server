import { test, expect } from "bun:test"
import { getTestServer } from "tests/fixtures/get-test-server"

test("admin dashboard links resolve to existing admin routes", async () => {
  const { axios } = await getTestServer()

  const res = await axios.get("/admin")
  const html = res.data as string

  expect(html).toContain('href="./files/list"')
  expect(html).toContain('href="./events/list"')
  expect(html).not.toContain('href="./admin/files/list"')
  expect(html).not.toContain('href="./admin/events/list"')

  const filesRes = await axios.get("/admin/files/list")
  expect(filesRes.status).toBe(200)

  const eventsRes = await axios.get("/admin/events/list")
  expect(eventsRes.status).toBe(200)
})
