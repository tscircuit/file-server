import type { FileProxy } from "../db/schema"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { normalizePath } from "./normalize-path"

export async function resolveFileProxy(
  proxy: FileProxy,
  file_path: string,
): Promise<Response> {
  const normalizedPath = normalizePath(file_path)
  const pattern = proxy.matching_pattern

  // Extract the relative path after the pattern prefix
  // Pattern: "prefix/*" -> prefix is "prefix/"
  const prefix = pattern.slice(0, -1) // Remove "*" to get "prefix/"
  const relativePath = normalizedPath.slice(prefix.length)

  if (proxy.proxy_type === "disk") {
    return resolveDiskProxy(proxy.disk_path, relativePath)
  } else {
    return resolveHttpProxy(proxy.http_target_url, relativePath)
  }
}

async function resolveDiskProxy(
  diskPath: string,
  relativePath: string,
): Promise<Response> {
  const fullPath = join(diskPath, relativePath)

  try {
    const content = await readFile(fullPath)
    const fileName = relativePath.split("/").pop() || "file"
    const contentType = getContentType(fileName)

    return new Response(content, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": content.byteLength.toString(),
      },
    })
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return new Response("File not found", { status: 404 })
    }
    console.error("Disk proxy error:", error)
    return new Response("Failed to read file from disk", { status: 500 })
  }
}

async function resolveHttpProxy(
  httpTargetUrl: string,
  relativePath: string,
): Promise<Response> {
  // Ensure the URL doesn't have double slashes
  const baseUrl = httpTargetUrl.endsWith("/")
    ? httpTargetUrl.slice(0, -1)
    : httpTargetUrl
  const targetUrl = `${baseUrl}/${relativePath}`

  try {
    const response = await fetch(targetUrl)

    if (!response.ok) {
      return new Response(`HTTP proxy returned status ${response.status}`, {
        status: response.status,
      })
    }

    // Pass through the response body and relevant headers
    const headers = new Headers()
    const contentType = response.headers.get("Content-Type")
    if (contentType) {
      headers.set("Content-Type", contentType)
    }
    const contentLength = response.headers.get("Content-Length")
    if (contentLength) {
      headers.set("Content-Length", contentLength)
    }
    const fileName = relativePath.split("/").pop() || "file"
    headers.set("Content-Disposition", `attachment; filename="${fileName}"`)

    return new Response(response.body, {
      status: response.status,
      headers,
    })
  } catch (error) {
    console.error("HTTP proxy error:", error)
    return new Response("Failed to fetch file from HTTP proxy", { status: 502 })
  }
}

function getContentType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase()
  const mimeTypes: Record<string, string> = {
    txt: "text/plain",
    html: "text/html",
    css: "text/css",
    js: "application/javascript",
    json: "application/json",
    xml: "application/xml",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    pdf: "application/pdf",
    zip: "application/zip",
  }
  return mimeTypes[ext || ""] || "application/octet-stream"
}
