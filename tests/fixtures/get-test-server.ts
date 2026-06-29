import { afterEach } from "bun:test"
import { tmpdir } from "node:os"
import defaultAxios from "redaxios"
import { startServer } from "./start-server"

interface TestFixture {
  url: string
  server: any
  axios: typeof defaultAxios
}

export const getTestServer = async (): Promise<TestFixture> => {
  const testInstanceId = Math.random().toString(36).substring(2, 15)
  const testDbName = `testdb${testInstanceId}`

  const server = await startServer({
    port: 0,
    testDbName,
  })

  const url = `http://127.0.0.1:${server.port}`
  const axios = defaultAxios.create({
    baseURL: url,
  })

  afterEach(async () => {
    await server.stop()
    // Here you might want to add logic to drop the test database
  })

  return {
    url,
    server,
    axios,
  }
}
