#!/usr/bin/env node
import { startServer } from "winterspec/adapters/node"
// @ts-ignore - bundle is generated at build time
import winterspecBundle from "./dist/bundle"

const port = process.env.PORT ? Number.parseInt(process.env.PORT) : 3062

async function main() {
  const server = await startServer(winterspecBundle, {
    port,
  })

  console.log(`Server running at http://localhost:${port}`)

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log("\nShutting down server...")
    server.close()
    process.exit(0)
  })
}

main().catch(console.error)
