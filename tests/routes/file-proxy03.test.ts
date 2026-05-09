import { test, expect } from "bun:test"
import { getTestServer } from "tests/fixtures/get-test-server"
import { Buffer } from "node:buffer"

test("http proxy file resolution", async () => {
  const { ky, url } = await getTestServer()

  await ky.post("files/upsert", {
    json: {
      file_path: "/source/test-file.txt",
      text_content: "Content served via HTTP proxy",
    },
  })

  await ky.post("files/upsert", {
    json: {
      file_path: "/source/data.json",
      text_content: '{"proxied": true}',
    },
  })

  const createRes = await ky.post("file_proxies/create", {
    json: {
      proxy_type: "http",
      http_target_url: `${url}/files/static/source`,
      matching_pattern: "http-test/*",
    },
  })
  expect(createRes.status).toBe(200)
  expect((await createRes.json<any>()).file_proxy.proxy_type).toBe("http")

  const downloadRes = await ky.get("files/download/http-test/test-file.txt")
  expect(downloadRes.status).toBe(200)
  expect(await downloadRes.text()).toBe("Content served via HTTP proxy")

  const jsonRes = await ky.get("files/download/http-test/data.json")
  expect(jsonRes.status).toBe(200)
  expect(await jsonRes.json<any>()).toEqual({ proxied: true })
})

test("http proxy 404 handling", async () => {
  const { ky, url } = await getTestServer()

  await ky.post("file_proxies/create", {
    json: {
      proxy_type: "http",
      http_target_url: `${url}/files/static/nonexistent`,
      matching_pattern: "http-404/*",
    },
  })

  const missingRes = await ky.get("files/download/http-404/missing.txt")
  expect(missingRes.status).toBe(404)
})

test("http proxy with query param download", async () => {
  const { ky, url } = await getTestServer()

  await ky.post("files/upsert", {
    json: {
      file_path: "/query-source/file.txt",
      text_content: "Query param HTTP proxy test",
    },
  })

  await ky.post("file_proxies/create", {
    json: {
      proxy_type: "http",
      http_target_url: `${url}/files/static/query-source`,
      matching_pattern: "http-query/*",
    },
  })

  const downloadRes = await ky.get("files/download", {
    searchParams: { file_path: "/http-query/file.txt" },
  })
  expect(downloadRes.status).toBe(200)
  expect(await downloadRes.text()).toBe("Query param HTTP proxy test")
})

test("http proxy binary file", async () => {
  const { ky, url } = await getTestServer()

  const binaryData = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ])
  const base64 = Buffer.from(binaryData).toString("base64")
  await ky.post("files/upsert", {
    json: {
      file_path: "/binary-source/image.png",
      binary_content_b64: base64,
    },
  })

  await ky.post("file_proxies/create", {
    json: {
      proxy_type: "http",
      http_target_url: `${url}/files/static/binary-source`,
      matching_pattern: "http-binary/*",
    },
  })

  const downloadRes = await ky.get("files/download/http-binary/image.png")
  expect(downloadRes.status).toBe(200)
  expect(new Uint8Array(await downloadRes.arrayBuffer())).toEqual(binaryData)
})
