import { test, expect } from "bun:test"
import { normalizePath } from "lib/utils/normalize-path"

test("normalizePath collapses all repeated slash groups", () => {
  expect(normalizePath("a///b///c.txt")).toBe("a/b/c.txt")
  expect(normalizePath("a//b//c//d")).toBe("a/b/c/d")
})

test("normalizePath is idempotent", () => {
  for (const p of ["a///b///c.txt", "a//b//c//d", "/a//b/", "//x///y//z"]) {
    const once = normalizePath(p)
    expect(normalizePath(once)).toBe(once)
  }
})

test("normalizePath keeps existing behavior for simple paths", () => {
  expect(normalizePath("")).toBe("")
  expect(normalizePath("/")).toBe("")
  expect(normalizePath("/a/b")).toBe("a/b")
  expect(normalizePath("a/b/")).toBe("a/b")
  expect(normalizePath("a\\b")).toBe("a/b")
})
