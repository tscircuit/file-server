import { expect, it } from "bun:test"
import { normalizePath } from "lib/utils/normalize-path"

it("collapses repeated slashes across the entire path", () => {
  expect(normalizePath("a///b///c.txt")).toBe("a/b/c.txt")
  expect(normalizePath("a//b//c//d")).toBe("a/b/c/d")
})

it("is idempotent", () => {
  const once = normalizePath("a///b//c///d.txt")
  expect(normalizePath(once)).toBe(once)
  expect(once).toBe("a/b/c/d.txt")
})

it("converts backslashes and collapses repeated slashes", () => {
  expect(normalizePath("a\\\\b\\\\c")).toBe("a/b/c")
  expect(normalizePath("a\\\\\\b//c")).toBe("a/b/c")
})

it("handles leading, trailing and root slashes", () => {
  expect(normalizePath("/a/b/c/")).toBe("a/b/c")
  expect(normalizePath("///a//b///")).toBe("a/b")
  expect(normalizePath("/")).toBe("")
  expect(normalizePath("")).toBe("")
})
