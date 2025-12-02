import { test, expect } from "bun:test"
import { getTestServer } from "tests/fixtures/get-test-server"

test("file proxy CRUD operations", async () => {
  const { axios } = await getTestServer()

  // Create a disk proxy
  const createDiskRes = await axios.post("/file_proxies/create", {
    proxy_type: "disk",
    disk_path: "/tmp/test-files",
    matching_pattern: "local/*",
  })
  expect(createDiskRes.status).toBe(200)
  expect(createDiskRes.data.file_proxy.proxy_type).toBe("disk")
  expect(createDiskRes.data.file_proxy.disk_path).toBe("/tmp/test-files")
  expect(createDiskRes.data.file_proxy.matching_pattern).toBe("local/*")
  expect(createDiskRes.data.file_proxy.file_proxy_id).toBeDefined()
  expect(createDiskRes.data.file_proxy.created_at).toBeDefined()

  const diskProxyId = createDiskRes.data.file_proxy.file_proxy_id

  // Create an HTTP proxy
  const createHttpRes = await axios.post("/file_proxies/create", {
    proxy_type: "http",
    http_target_url: "https://example.com/files",
    matching_pattern: "remote/*",
  })
  expect(createHttpRes.status).toBe(200)
  expect(createHttpRes.data.file_proxy.proxy_type).toBe("http")
  expect(createHttpRes.data.file_proxy.http_target_url).toBe(
    "https://example.com/files",
  )
  expect(createHttpRes.data.file_proxy.matching_pattern).toBe("remote/*")

  const httpProxyId = createHttpRes.data.file_proxy.file_proxy_id

  // Get proxy by ID
  const getByIdRes = await axios.get("/file_proxies/get", {
    params: { file_proxy_id: diskProxyId },
  })
  expect(getByIdRes.status).toBe(200)
  expect(getByIdRes.data.file_proxy.file_proxy_id).toBe(diskProxyId)
  expect(getByIdRes.data.file_proxy.proxy_type).toBe("disk")

  // Get proxy by matching_pattern
  const getByPatternRes = await axios.get("/file_proxies/get", {
    params: { matching_pattern: "remote/*" },
  })
  expect(getByPatternRes.status).toBe(200)
  expect(getByPatternRes.data.file_proxy.file_proxy_id).toBe(httpProxyId)
  expect(getByPatternRes.data.file_proxy.proxy_type).toBe("http")

  // Get non-existent proxy
  const getNonExistentRes = await axios.get("/file_proxies/get", {
    params: { file_proxy_id: "non-existent" },
  })
  expect(getNonExistentRes.status).toBe(200)
  expect(getNonExistentRes.data.file_proxy).toBeNull()

  // List all proxies
  const listRes = await axios.get("/file_proxies/list")
  expect(listRes.status).toBe(200)
  expect(listRes.data.file_proxies).toHaveLength(2)

  const diskProxy = listRes.data.file_proxies.find(
    (p: any) => p.proxy_type === "disk",
  )
  const httpProxy = listRes.data.file_proxies.find(
    (p: any) => p.proxy_type === "http",
  )
  expect(diskProxy).toBeDefined()
  expect(httpProxy).toBeDefined()
})

test("file proxy create validation - duplicate pattern", async () => {
  const { axios } = await getTestServer()

  // Create first proxy
  await axios.post("/file_proxies/create", {
    proxy_type: "disk",
    disk_path: "/tmp/test",
    matching_pattern: "duplicate/*",
  })

  // Duplicate matching_pattern should fail with 400
  await expect(
    axios.post("/file_proxies/create", {
      proxy_type: "http",
      http_target_url: "https://example.com",
      matching_pattern: "duplicate/*",
    }),
  ).rejects.toMatchObject({
    status: 400,
  })
})
