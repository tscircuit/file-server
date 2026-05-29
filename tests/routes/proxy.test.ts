import { expect, test, describe } from "bun:test"
import { getTestServer } from "../fixtures/get-test-server"
import { getFakeTargetServer } from "../fixtures/get-fake-target-server"

describe("proxy route", () => {
  test("should proxy requests to target URL", async () => {
    const { axios } = await getTestServer()
    const target = await getFakeTargetServer(
      () =>
        new Response(JSON.stringify({ message: "Hello from mock server!" }), {
          headers: { "Content-Type": "application/json" },
        }),
    )

    const response = await axios.get("/proxy", {
      headers: { "X-Target-Url": target.url },
    })

    expect(response.status).toBe(200)
    expect(response.data).toEqual({ message: "Hello from mock server!" })
  })

  test("should return 400 when X-Target-Url header is missing", async () => {
    const { axios } = await getTestServer()

    const response = await axios.get("/proxy", { validateStatus: () => true })
    expect(response.status).toBe(400)
    expect(response.data).toEqual({
      error: "X-Target-Url header is required",
    })
  })

  test("should handle POST requests with a body correctly", async () => {
    const { axios } = await getTestServer()
    // Echo the request body back.
    const target = await getFakeTargetServer(
      (req) =>
        new Response(req.body, {
          headers: { "Content-Type": "application/json" },
        }),
    )

    const testData = { test: "data" }
    const response = await axios.post("/proxy", testData, {
      headers: {
        "X-Target-Url": target.url,
        "Content-Type": "application/json",
      },
    })

    expect(response.status).toBe(200)
    expect(response.data).toEqual(testData)
  })

  test("should NOT forward the caller's own Cookie/Origin to the target", async () => {
    const { axios } = await getTestServer()
    // Reflect back the request-identity headers the target received.
    const target = await getFakeTargetServer(
      (req) =>
        new Response(
          JSON.stringify({
            cookie: req.headers.get("cookie"),
            origin: req.headers.get("origin"),
          }),
          { headers: { "Content-Type": "application/json" } },
        ),
    )

    const response = await axios.get("/proxy", {
      headers: {
        "X-Target-Url": target.url,
        // Caller's own (e.g. localhost browser) cookie + origin — these
        // must NOT be relayed to the proxied third-party target.
        Cookie: "session=secret; ph_phc_test_posthog=%7B%22a%22%3A1%7D",
        Origin: "http://localhost:3020",
      },
    })

    expect(response.status).toBe(200)
    expect(response.data.cookie).toBeNull()
    expect(response.data.origin).toBeNull()
  })

  test("should forward Cookie/Origin only when given via X-Sender-*", async () => {
    const { axios } = await getTestServer()
    const target = await getFakeTargetServer(
      (req) =>
        new Response(
          JSON.stringify({
            cookie: req.headers.get("cookie"),
            origin: req.headers.get("origin"),
          }),
          { headers: { "Content-Type": "application/json" } },
        ),
    )

    const response = await axios.get("/proxy", {
      headers: {
        "X-Target-Url": target.url,
        "X-Sender-Cookie": "intended=value",
        "X-Sender-Origin": "https://example.com",
      },
    })

    expect(response.status).toBe(200)
    expect(response.data.cookie).toBe("intended=value")
    expect(response.data.origin).toBe("https://example.com")
  })

  test("a WAF-style target that 403s on any Cookie now succeeds (the real bug)", async () => {
    const { axios } = await getTestServer()
    // Mimic easyeda's CloudFront WAF: reject with 403 any request that
    // arrives carrying a Cookie header, succeed otherwise. This is what
    // actually broke part imports in the browser — the dev server forwarded
    // the page's localhost cookies (consent + PostHog) to easyeda, which the
    // WAF rejected. The fix strips them, so this target lets the request in.
    const target = await getFakeTargetServer((req) =>
      req.headers.get("cookie")
        ? new Response("Forbidden", { status: 403 })
        : new Response(JSON.stringify({ ok: true }), {
            headers: { "Content-Type": "application/json" },
          }),
    )

    const response = await axios.get("/proxy", {
      validateStatus: () => true,
      headers: {
        "X-Target-Url": target.url,
        // The exact cookie shape a browser leaked: consent + PostHog.
        Cookie: "cc_cookie=consent; ph_phc_test_posthog=%7B%22a%22%3A1%7D",
        Origin: "http://localhost:3020",
      },
    })

    // Before the fix this forwarded the cookie and came back 403.
    expect(response.status).toBe(200)
    expect(response.data).toEqual({ ok: true })
  })
})
