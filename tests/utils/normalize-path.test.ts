import { expect, test, describe } from "bun:test"
import { normalizePath } from "../../lib/utils/normalize-path"

describe("normalizePath", () => {
  test("handles empty or root paths", () => {
    expect(normalizePath("")).toBe("")
    expect(normalizePath("/")).toBe("")
    expect(normalizePath("///")).toBe("")
  })

  test("collapses multiple repeated slashes across the path", () => {
    expect(normalizePath("a///b///c.txt")).toBe("a/b/c.txt")
    expect(normalizePath("a//b//c//d")).toBe("a/b/c/d")
    expect(normalizePath("///a//b///c//")).toBe("a/b/c")
  })

  test("is idempotent across multiple applications", () => {
    const inputs = [
      "a///b///c.txt",
      "a//b//c//d",
      "///folder//subfolder///file.json",
      "path/to/normal/file.txt",
      "\\\\windows\\\\style\\\\path",
    ]

    for (const input of inputs) {
      const once = normalizePath(input)
      const twice = normalizePath(once)
      expect(twice).toBe(once)
    }
  })

  test("handles windows backslashes correctly", () => {
    expect(normalizePath("a\\\\b\\\\c.txt")).toBe("a/b/c.txt")
    expect(normalizePath("\\\\a\\b\\c")).toBe("a/b/c")
  })
})
