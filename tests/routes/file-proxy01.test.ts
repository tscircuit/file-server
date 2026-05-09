import { test, expect } from "bun:test"
import { getTestServer } from "tests/fixtures/get-test-server"

test("file proxy CRUD operations", async () => {
  const { ky } = await getTestServer()

  const createDiskRes = await ky.post("file_proxies/create", {
    json: {
      proxy_type: "disk",
      disk_path: "/tmp/test-files",
      matching_pattern: "local/*",
    },
  })
  expect(createDiskRes.status).toBe(200)
  const createDiskData = await createDiskRes.json<any>()
  expect(createDiskData.file_proxy.proxy_type).toBe("disk")
  expect(createDiskData.file_proxy.disk_path).toBe("/tmp/test-files")
  expect(createDiskData.file_proxy.matching_pattern).toBe("local/*")
  expect(createDiskData.file_proxy.file_proxy_id).toBeDefined()
  expect(createDiskData.file_proxy.created_at).toBeDefined()

  const diskProxyId = createDiskData.file_proxy.file_proxy_id

  const createHttpRes = await ky.post("file_proxies/create", {
    json: {
      proxy_type: "http",
      http_target_url: "https://example.com/files",
      matching_pattern: "remote/*",
    },
  })
  expect(createHttpRes.status).toBe(200)
  const createHttpData = await createHttpRes.json<any>()
  expect(createHttpData.file_proxy.proxy_type).toBe("http")
  expect(createHttpData.file_proxy.http_target_url).toBe(
    "https://example.com/files",
  )
  expect(createHttpData.file_proxy.matching_pattern).toBe("remote/*")

  const httpProxyId = createHttpData.file_proxy.file_proxy_id

  const getByIdRes = await ky.get("file_proxies/get", {
    searchParams: { file_proxy_id: diskProxyId },
  })
  expect(getByIdRes.status).toBe(200)
  const getByIdData = await getByIdRes.json<any>()
  expect(getByIdData.file_proxy.file_proxy_id).toBe(diskProxyId)
  expect(getByIdData.file_proxy.proxy_type).toBe("disk")

  const getByPatternRes = await ky.get("file_proxies/get", {
    searchParams: { matching_pattern: "remote/*" },
  })
  expect(getByPatternRes.status).toBe(200)
  const getByPatternData = await getByPatternRes.json<any>()
  expect(getByPatternData.file_proxy.file_proxy_id).toBe(httpProxyId)
  expect(getByPatternData.file_proxy.proxy_type).toBe("http")

  const getNonExistentRes = await ky.get("file_proxies/get", {
    searchParams: { file_proxy_id: "non-existent" },
  })
  expect(getNonExistentRes.status).toBe(200)
  const getNonExistentData = await getNonExistentRes.json<any>()
  expect(getNonExistentData.file_proxy).toBeNull()

  const listRes = await ky.get("file_proxies/list")
  expect(listRes.status).toBe(200)
  const listData = await listRes.json<any>()
  expect(listData.file_proxies).toHaveLength(2)

  const diskProxy = listData.file_proxies.find(
    (p: any) => p.proxy_type === "disk",
  )
  const httpProxy = listData.file_proxies.find(
    (p: any) => p.proxy_type === "http",
  )
  expect(diskProxy).toBeDefined()
  expect(httpProxy).toBeDefined()
})

test("file proxy create validation - duplicate pattern", async () => {
  const { ky } = await getTestServer()

  await ky.post("file_proxies/create", {
    json: {
      proxy_type: "disk",
      disk_path: "/tmp/test",
      matching_pattern: "duplicate/*",
    },
  })

  const duplicateRes = await ky.post("file_proxies/create", {
    json: {
      proxy_type: "http",
      http_target_url: "https://example.com",
      matching_pattern: "duplicate/*",
    },
  })
  expect(duplicateRes.status).toBe(400)
})
