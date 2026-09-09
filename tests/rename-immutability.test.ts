import { expect, test } from "bun:test"
import { createDatabase } from "lib/db/db-client"

test("rename does not mutate previously observed event arrays", () => {
  const db = createDatabase()
  db.upsertFile(
    {
      file_path: "source.txt",
      text_content: "data",
      created_at: "2025-06-01T00:00:00.000Z",
    },
    {},
  )

  const observed = db.events
  const observedCopy = [...observed]
  const observedLength = observed.length

  const renamed = db.renameFile("source.txt", "dest.txt", {})
  expect(renamed?.file_path).toBe("dest.txt")

  // The previously held reference must be untouched.
  expect(observed).toHaveLength(observedLength)
  expect(observed).toEqual(observedCopy)

  // The store must expose a new array containing the two rename events.
  expect(db.events).not.toBe(observed)
  expect(db.events).toHaveLength(observedLength + 2)
  expect(db.events.slice(-2).map((e) => e.event_type)).toEqual([
    "FILE_CREATED",
    "FILE_DELETED",
  ])
})
