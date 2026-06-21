import { expect, test } from "bun:test"
import { getAttachmentContentDisposition } from "lib/utils/get-attachment-content-disposition"

test("uses a simple filename for safe ASCII names", () => {
  expect(getAttachmentContentDisposition("report.txt")).toBe(
    'attachment; filename="report.txt"',
  )
})

test("adds a UTF-8 filename for non-ASCII and unsafe characters", () => {
  expect(getAttachmentContentDisposition('报价 "final".txt')).toBe(
    "attachment; filename=\"__ _final_.txt\"; filename*=UTF-8''%E6%8A%A5%E4%BB%B7%20%22final%22.txt",
  )
})
