import { expect, test, describe } from "bun:test"
import { normalizePath } from "../lib/utils/normalize-path"

describe("normalizePath", () => {
  test("collapses multiple repeated slashes", () => {
    expect(normalizePath("a///b///c.txt")).toBe("a/b/c.txt")
    expect(normalizePath("a//b//c//d")).toBe("a/b/c/d")
  })

  test("is idempotent across multiple calls", () => {
    const raw = "a///b//c////d//e.txt"
    const pass1 = normalizePath(raw)
    const pass2 = normalizePath(pass1)
    expect(pass1).toBe(pass2)
    expect(pass1).toBe("a/b/c/d/e.txt")
  })

  test("handles mixed and windows slashes", () => {
    expect(normalizePath("a\\\\b\\\\c\\d")).toBe("a/b/c/d")
    expect(normalizePath("a\\\\//b//\\c")).toBe("a/b/c")
  })

  test("handles empty and root", () => {
    expect(normalizePath("")).toBe("")
    expect(normalizePath("/")).toBe("")
  })
})
