import { expect, test } from "bun:test"
import { normalizePath } from "../../lib/utils/normalize-path"

test("collapses every repeated slash group, not just the first", () => {
  expect(normalizePath("a///b///c.txt")).toBe("a/b/c.txt")
  expect(normalizePath("a//b//c//d")).toBe("a/b/c/d")
  expect(normalizePath("//a//b")).toBe("a/b")
})

test("normalizePath is idempotent", () => {
  const cases = [
    "a///b///c.txt",
    "a//b//c//d",
    "//a//b",
    "a//",
    "///",
    "a/b",
    "",
    "/",
  ]
  for (const input of cases) {
    const once = normalizePath(input)
    expect(normalizePath(once)).toBe(once)
  }
})

test("keeps existing behaviour for backslashes, leading and trailing slashes", () => {
  expect(normalizePath("a\\\\b")).toBe("a/b")
  expect(normalizePath("/a/b")).toBe("a/b")
  expect(normalizePath("a/b/")).toBe("a/b")
  expect(normalizePath("/")).toBe("")
})
