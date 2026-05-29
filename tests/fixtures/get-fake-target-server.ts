import { afterEach } from "bun:test"

export type FakeTargetHandler = (req: Request) => Response | Promise<Response>

/**
 * Start a throwaway HTTP server that stands in for the third-party target the
 * `/proxy` route forwards to. Pass a fetch handler describing how the target
 * should respond (reflect headers, echo the body, mimic a WAF, etc.). The
 * server is torn down automatically after each test.
 */
export const getFakeTargetServer = async (handler: FakeTargetHandler) => {
  const port = 4100 + Math.floor(Math.random() * 800)
  const server = Bun.serve({ port, fetch: handler })

  afterEach(() => {
    server.stop()
  })

  return { url: `http://localhost:${port}`, port }
}
