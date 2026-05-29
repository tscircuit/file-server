import { expect, test, describe } from "bun:test"
import { getTestServer } from "../fixtures/get-test-server"

describe("proxy route", () => {
  test("should proxy requests to target URL", async () => {
    const { axios } = await getTestServer()

    // Create a mock server for testing proxying
    const mockServerPort = 3999
    const mockServer = Bun.serve({
      port: mockServerPort,
      fetch(req) {
        return new Response(
          JSON.stringify({ message: "Hello from mock server!" }),
          {
            headers: { "Content-Type": "application/json" },
          },
        )
      },
    })

    try {
      const response = await axios.get("/proxy", {
        headers: {
          "X-Target-Url": `http://localhost:${mockServerPort}`,
        },
      })

      expect(response.status).toBe(200)
      expect(response.data).toEqual({ message: "Hello from mock server!" })
    } finally {
      mockServer.stop()
    }
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

    // Create a mock server that echoes back the request body
    const mockServerPort = 4000
    const mockServer = Bun.serve({
      port: mockServerPort,
      fetch(req) {
        return new Response(req.body, {
          headers: { "Content-Type": "application/json" },
        })
      },
    })

    try {
      const testData = { test: "data" }
      const response = await axios.post("/proxy", testData, {
        headers: {
          "X-Target-Url": `http://localhost:${mockServerPort}`,
          "Content-Type": "application/json",
        },
      })

      expect(response.status).toBe(200)
      expect(response.data).toEqual(testData)
    } finally {
      mockServer.stop()
    }
  })

  test("should NOT forward the caller's own Cookie/Origin to the target", async () => {
    const { axios } = await getTestServer()

    // Mock target that reflects the headers it received.
    const mockServerPort = 4001
    const mockServer = Bun.serve({
      port: mockServerPort,
      fetch(req) {
        return new Response(
          JSON.stringify({
            cookie: req.headers.get("cookie"),
            origin: req.headers.get("origin"),
          }),
          { headers: { "Content-Type": "application/json" } },
        )
      },
    })

    try {
      const response = await axios.get("/proxy", {
        headers: {
          "X-Target-Url": `http://localhost:${mockServerPort}`,
          // Caller's own (e.g. localhost browser) cookie + origin — these
          // must NOT be relayed to the proxied third-party target.
          Cookie: "session=secret; ph_phc_test_posthog=%7B%22a%22%3A1%7D",
          Origin: "http://localhost:3020",
        },
      })

      expect(response.status).toBe(200)
      expect(response.data.cookie).toBeNull()
      expect(response.data.origin).toBeNull()
    } finally {
      mockServer.stop()
    }
  })

  test("should forward Cookie/Origin only when given via X-Sender-*", async () => {
    const { axios } = await getTestServer()

    const mockServerPort = 4002
    const mockServer = Bun.serve({
      port: mockServerPort,
      fetch(req) {
        return new Response(
          JSON.stringify({
            cookie: req.headers.get("cookie"),
            origin: req.headers.get("origin"),
          }),
          { headers: { "Content-Type": "application/json" } },
        )
      },
    })

    try {
      const response = await axios.get("/proxy", {
        headers: {
          "X-Target-Url": `http://localhost:${mockServerPort}`,
          "X-Sender-Cookie": "intended=value",
          "X-Sender-Origin": "https://example.com",
        },
      })

      expect(response.status).toBe(200)
      expect(response.data.cookie).toBe("intended=value")
      expect(response.data.origin).toBe("https://example.com")
    } finally {
      mockServer.stop()
    }
  })
})
