import { test, expect } from "bun:test"
import { createDatabase } from "lib/db/db-client"

test("rename preserves previous events snapshots", () => {
  const db = createDatabase()
  db.upsertFile(
    {
      file_path: "before.txt",
      text_content: "content",
      created_at: "2025-01-01T00:00:00Z",
    },
    {},
  )
  const previous = db.events
  const snapshot = [...previous]
  db.renameFile("before.txt", "after.txt", {})
  expect(previous).toEqual(snapshot)
  expect(db.events).not.toBe(previous)
  expect(db.events.slice(-2).map((event) => event.event_type)).toEqual([
    "FILE_CREATED",
    "FILE_DELETED",
  ])
})
