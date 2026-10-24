import { expect, test } from "bun:test"
import { getTestServer } from "tests/fixtures/get-test-server"

// /files/static serves user-written content on the same origin as the /admin
// dashboards. HTML/SVG/JS files served before this hardening executed script
// in that origin (one hop from admin pages). The static route now applies a
// sandboxing CSP (no script execution, no same-origin access) to active
// content types plus X-Content-Type-Options: nosniff everywhere, while
// serving the bytes unchanged.

const BODIES: Record<string, string> = {
  html: "<html><body><script>alert(1)</script></body></html>",
  svg: '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
  js: "alert(1)",
}

test.each(["html", "svg", "js"])(
  "static route sandboxes active content type .%s",
  async (ext) => {
    const { axios, url: rawUrl } = await getTestServer()

    await axios.post("/files/upsert", {
      file_path: `/active/poc.${ext}`,
      text_content: BODIES[ext],
    })

    const response = await fetch(`${rawUrl}/files/static/active/poc.${ext}`)
    expect(response.status).toBe(200)
    expect(response.headers.get("x-content-type-options")).toBe("nosniff")
    expect(response.headers.get("content-security-policy")).toContain("sandbox")
    // bytes unchanged
    const body = await response.text()
    if (ext === "html") expect(body).toContain("<body>")
    if (ext === "svg") expect(body).toContain("<svg")
    if (ext === "js") expect(body).toBe("alert(1)")
  },
)

test("inactive content types get nosniff but no sandbox CSP", async () => {
  const { axios, url: rawUrl } = await getTestServer()

  await axios.post("/files/upsert", {
    file_path: "/active/plain.txt",
    text_content: "just text",
  })

  const response = await fetch(`${rawUrl}/files/static/active/plain.txt`)
  expect(response.status).toBe(200)
  expect(response.headers.get("x-content-type-options")).toBe("nosniff")
  expect(response.headers.get("content-security-policy")).toBeNull()
  expect(await response.text()).toContain("just text")
})
