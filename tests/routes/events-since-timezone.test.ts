import { expect, test } from "bun:test"
import { getTestServer } from "tests/fixtures/get-test-server"

// Format an absolute instant using an explicit numeric timezone offset,
// e.g. offsetHours=+3 -> "+03:00". The wall-clock is shifted so the
// resulting string denotes the same instant as `instantMs`.
function formatWithOffset(instantMs: number, offsetHours: number): string {
  const sign = offsetHours >= 0 ? "+" : "-"
  const abs = Math.abs(offsetHours)
  const hh = String(Math.floor(abs)).padStart(2, "0")
  const mm = String(Math.round((abs % 1) * 60)).padStart(2, "0")
  const wallClock = new Date(instantMs + offsetHours * 3_600_000)
    .toISOString()
    .slice(0, 23)
  return `${wallClock}${sign}${hh}:${mm}`
}

test("events/list since compares absolute time, not raw strings", async () => {
  const { axios } = await getTestServer()

  const created = await axios.post("/events/create", {
    event_type: "FILE_UPDATED",
    file_path: "tz-check.txt",
  })
  const eventInstant = Date.parse(created.data.event.created_at)
  expect(Number.isNaN(eventInstant)).toBe(false)

  // A `since` 1ms before the event, rendered with a +03:00 wall-clock that
  // sorts lexicographically *after* the stored "Z" timestamp.
  const justBefore = formatWithOffset(eventInstant - 1, 3)
  const shouldContain = await axios.get("/events/list", {
    params: { since: justBefore },
  })
  expect(shouldContain.data.event_list).toHaveLength(1)

  // The exact same instant rendered with a -02:00 offset. String comparison
  // would treat it as earlier and wrongly include the event.
  const sameInstant = formatWithOffset(eventInstant, -2)
  const shouldExclude = await axios.get("/events/list", {
    params: { since: sameInstant },
  })
  expect(shouldExclude.data.event_list).toHaveLength(0)
})
