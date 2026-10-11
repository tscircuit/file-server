import { describe, expect, it } from "bun:test"
import { normalizePath } from "../../lib/utils/normalize-path"

describe("normalizePath", () => {
  it("collapses multiple internal repeated-slash groups", () => {
    expect(normalizePath("a///b///c.txt")).toBe("a/b/c.txt")
  })

  it("collapses every repeated-slash group", () => {
    expect(normalizePath("a//b//c//d")).toBe("a/b/c/d")
  })

  it("handles repeated leading and trailing slashes", () => {
    expect(normalizePath("///a///b///")).toBe("a/b")
  })

  it("normalizes three repeated-slash groups", () => {
    expect(normalizePath("a////b//c///d")).toBe("a/b/c/d")
  })

  it("is idempotent", () => {
    const once = normalizePath("a///b///c.txt")
    expect(normalizePath(once)).toBe(once)
  })

  it("keeps ordinary paths unchanged", () => {
    expect(normalizePath("a/b/c.txt")).toBe("a/b/c.txt")
  })

  it("handles empty and root paths", () => {
    expect(normalizePath("")).toBe("")
    expect(normalizePath("/")).toBe("")
    expect(normalizePath("////")).toBe("")
  })

  it("normalizes Windows-style separators", () => {
    expect(normalizePath(String.raw`a\b\c.txt`)).toBe("a/b/c.txt")
  })

  it("removes a single leading and trailing slash", () => {
    expect(normalizePath("/a/b/")).toBe("a/b")
  })
})
