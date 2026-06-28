import { test, expect } from "bun:test"
import { getTestServer } from "tests/fixtures/get-test-server"
import { Buffer } from "node:buffer"
import { buildHttpProxyUrl } from "lib/utils/resolve-file-proxy"

test("http proxy URL preserves special characters as path data", () => {
  const targetUrl = buildHttpProxyUrl(
    "https://example.com/files/static/source?token=abc",
    "folder name/report?final#1.txt",
  )

  expect(targetUrl.toString()).toBe(
    "https://example.com/files/static/source/folder%20name/report%3Ffinal%231.txt?token=abc",
  )
})

test("http proxy file resolution", async () => {
  const { axios, url } = await getTestServer()

  // First, create a file on the server that we'll proxy to
  await axios.post("/files/upsert", {
    file_path: "/source/test-file.txt",
    text_content: "Content served via HTTP proxy",
  })

  await axios.post("/files/upsert", {
    file_path: "/source/data.json",
    text_content: '{"proxied": true}',
  })

  // Create an HTTP proxy pointing to the server's static file endpoint
  const createRes = await axios.post("/file_proxies/create", {
    proxy_type: "http",
    http_target_url: `${url}/files/static/source`,
    matching_pattern: "http-test/*",
  })
  expect(createRes.status).toBe(200)
  expect(createRes.data.file_proxy.proxy_type).toBe("http")

  // Test downloading a file through the HTTP proxy
  const downloadRes = await axios.get("/files/download/http-test/test-file.txt")
  expect(downloadRes.status).toBe(200)
  expect(downloadRes.data).toBe("Content served via HTTP proxy")

  // Test downloading JSON through proxy
  const jsonRes = await axios.get("/files/download/http-test/data.json")
  expect(jsonRes.status).toBe(200)
  expect(jsonRes.data).toEqual({ proxied: true })
})

test("http proxy 404 handling", async () => {
  const { axios, url } = await getTestServer()

  // Create an HTTP proxy pointing to the server
  await axios.post("/file_proxies/create", {
    proxy_type: "http",
    http_target_url: `${url}/files/static/nonexistent`,
    matching_pattern: "http-404/*",
  })

  // Test that 404 is properly propagated
  await expect(
    axios.get("/files/download/http-404/missing.txt"),
  ).rejects.toMatchObject({
    status: 404,
  })
})

test("http proxy with query param download", async () => {
  const { axios, url } = await getTestServer()

  // Create source file
  await axios.post("/files/upsert", {
    file_path: "/query-source/file.txt",
    text_content: "Query param HTTP proxy test",
  })

  // Create HTTP proxy
  await axios.post("/file_proxies/create", {
    proxy_type: "http",
    http_target_url: `${url}/files/static/query-source`,
    matching_pattern: "http-query/*",
  })

  // Test downloading via query parameter
  const downloadRes = await axios.get("/files/download", {
    params: { file_path: "/http-query/file.txt" },
  })
  expect(downloadRes.status).toBe(200)
  expect(downloadRes.data).toBe("Query param HTTP proxy test")
})

test("http proxy downloads paths containing URL delimiters", async () => {
  const { axios, url } = await getTestServer()

  await axios.post("/files/upsert", {
    file_path: "/special-source/report?final#1.txt",
    text_content: "Special path HTTP proxy test",
  })

  await axios.post("/file_proxies/create", {
    proxy_type: "http",
    http_target_url: `${url}/files/static/special-source`,
    matching_pattern: "http-special/*",
  })

  const downloadRes = await axios.get("/files/download", {
    params: { file_path: "/http-special/report?final#1.txt" },
  })

  expect(downloadRes.status).toBe(200)
  expect(downloadRes.data).toBe("Special path HTTP proxy test")
})

test("http proxy binary file", async () => {
  const { axios, url } = await getTestServer()

  // Create a binary file on the server
  const binaryData = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ])
  const base64 = Buffer.from(binaryData).toString("base64")
  await axios.post("/files/upsert", {
    file_path: "/binary-source/image.png",
    binary_content_b64: base64,
  })

  // Create HTTP proxy
  await axios.post("/file_proxies/create", {
    proxy_type: "http",
    http_target_url: `${url}/files/static/binary-source`,
    matching_pattern: "http-binary/*",
  })

  // Test downloading binary file through proxy
  const downloadRes = await axios.get("/files/download/http-binary/image.png", {
    responseType: "arrayBuffer",
  })
  expect(downloadRes.status).toBe(200)
  expect(new Uint8Array(downloadRes.data)).toEqual(binaryData)
})
