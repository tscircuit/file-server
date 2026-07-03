import esbuild from "esbuild"
import { mkdir, readdir, writeFile } from "node:fs/promises"
import path from "node:path"

type RouteFile = {
  absolutePath: string
  relativePath: string
  route: string
}

const projectRoot = path.resolve(import.meta.dir, "..")
const routesDir = path.join(projectRoot, "routes")
const outputPath = path.join(projectRoot, "dist", "bundle.js")

const collectRouteFiles = async (
  dir: string,
  baseDir = dir,
): Promise<Array<RouteFile>> => {
  const entries = await readdir(dir, { withFileTypes: true })
  const files: Array<RouteFile> = []

  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      files.push(...(await collectRouteFiles(absolutePath, baseDir)))
      continue
    }

    if (!/\.(ts|tsx)$/.test(entry.name)) {
      continue
    }

    const relativePath = path.relative(baseDir, absolutePath)
    const posixRelativePath = relativePath.split(path.sep).join("/")
    const routePath = `/${posixRelativePath}`
    const route =
      routePath.endsWith("/index.ts") || routePath.endsWith("/index.tsx")
        ? routePath.replace(/\/index\.tsx*$/g, "")
        : routePath.replace(/\.tsx*$/g, "")

    files.push({
      absolutePath,
      relativePath: posixRelativePath,
      route: route === "" ? "/" : route,
    })
  }

  return files
}

const routes = (await collectRouteFiles(routesDir)).sort((a, b) =>
  a.route.localeCompare(b.route),
)

const manifest = `
import { getRouteMatcher } from "next-route-matcher"
import { makeRequestAgainstWinterSpec } from "winterspec"

${routes
  .map(
    ({ absolutePath }, index) =>
      `import * as route_${index} from ${JSON.stringify(
        absolutePath.replace(/\\/g, "/"),
      )}`,
  )
  .join("\n")}

const routeMapWithHandlers = {
  ${routes
    .map(({ route }, index) => `"${route}": route_${index}.default`)
    .join(",\n  ")}
}

const winterSpec = {
  routeMatcher: getRouteMatcher(Object.keys(routeMapWithHandlers)),
  routeMapWithHandlers,
  makeRequest: async (req, options) => makeRequestAgainstWinterSpec(winterSpec, options)(req),
}

export default winterSpec
`

const result = await esbuild.build({
  stdin: {
    contents: manifest,
    resolveDir: routesDir,
    loader: "ts",
  },
  bundle: true,
  format: "esm",
  write: false,
  sourcemap: "inline",
  platform: "node",
  packages: "external",
})

await mkdir(path.dirname(outputPath), { recursive: true })
await writeFile(outputPath, result.outputFiles[0].text)

console.log(`Built bundle to ${path.relative(projectRoot, outputPath)}`)
