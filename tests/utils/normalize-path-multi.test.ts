import { describe, expect, test } from "bun:test"
import { normalizePath } from "../../lib/utils/normalize-path"

describe("normalizePath", () => {
  // Issue: normalizePath only collapsed the first repeated slash group, so
  // it was not idempotent and produced different results on repeated calls
  // (the db-client normalizes on write and again on lookup).
  test("collapses every repeated slash group", () => {
    expect(normalizePath("a///b///c.txt")).toBe("a/b/c.txt")
    expect(normalizePath("a//b//c//d")).toBe("a/b/c/d")
    expect(normalizePath("a///b//c/d")).toBe("a/b/c/d")
  })

  test("is idempotent", () => {
    for (const input of ["a///b///c.txt", "a//b//c//d", "a///b//c/d"]) {
      const once = normalizePath(input)
      expect(normalizePath(once)).toBe(once)
    }
  })

  test("keeps leading/trailing slash trimming", () => {
    expect(normalizePath("//a/b//")).toBe("a/b")
    expect(normalizePath("/a/b/c/")).toBe("a/b/c")
  })

  test("handles windows separators with repeated groups", () => {
    expect(normalizePath("a\\\\b\\\\/c//d")).toBe("a/b/c/d")
  })

  test("empty and root paths", () => {
    expect(normalizePath("")).toBe("")
    expect(normalizePath("/")).toBe("")
    expect(normalizePath("///")).toBe("")
    expect(normalizePath("plain.txt")).toBe("plain.txt")
  })
})
