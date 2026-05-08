import { expect, test, describe } from "bun:test"
import { getTestServer } from "../fixtures/get-test-server"

describe("proxy route", () => {
  test("should proxy requests to target URL", async () => {
    const { ky } = await getTestServer()

    const mockServerPort = 3999
    const mockServer = Bun.serve({
      port: mockServerPort,
      fetch() {
        return new Response(
          JSON.stringify({ message: "Hello from mock server!" }),
          {
            headers: { "Content-Type": "application/json" },
          },
        )
      },
    })

    try {
      const response = await ky.get("proxy", {
        headers: {
          "X-Target-Url": `http://localhost:${mockServerPort}`,
        },
      })

      expect(response.status).toBe(200)
      expect(await response.json<any>()).toEqual({ message: "Hello from mock server!" })
    } finally {
      mockServer.stop()
    }
  })

  test("should return 400 when X-Target-Url header is missing", async () => {
    const { ky } = await getTestServer()

    const response = await ky.get("proxy")
    expect(response.status).toBe(400)
    expect(await response.json<any>()).toEqual({
      error: "X-Target-Url header is required",
    })
  })

  test("should handle POST requests with a body correctly", async () => {
    const { ky } = await getTestServer()

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
      const response = await ky.post("proxy", {
        json: testData,
        headers: {
          "X-Target-Url": `http://localhost:${mockServerPort}`,
          "Content-Type": "application/json",
        },
      })

      expect(response.status).toBe(200)
      expect(await response.json<any>()).toEqual(testData)
    } finally {
      mockServer.stop()
    }
  })
})
