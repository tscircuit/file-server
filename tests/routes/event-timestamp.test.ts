import { test, expect } from "bun:test"
import { getTestServer } from "tests/fixtures/get-test-server"

test("since compares instants rather than timestamp strings", async () => {
  const { axios } = await getTestServer()
  const created = await axios.post("/events/create", {
    event_type: "FILE_UPDATED",
    file_path: "test.txt",
  })
  const instant = Date.parse(created.data.event.created_at)
  const earlierOffset = new Date(instant + 2 * 3600000 - 1)
    .toISOString()
    .replace("Z", "+02:00")
  const equalOffset = new Date(instant - 3600000)
    .toISOString()
    .replace("Z", "-01:00")
  const later = await axios.get("/events/list", {
    params: { since: earlierOffset },
  })
  expect(later.data.event_list).toHaveLength(1)
  const equal = await axios.get("/events/list", {
    params: { since: equalOffset },
  })
  expect(equal.data.event_list).toHaveLength(0)
})
