import { test, expect } from "bun:test"
import { getTestServer } from "tests/fixtures/get-test-server"

test("download by query and by path", async () => {
  const { axios } = await getTestServer()
  await axios.post("/files/upsert", {
    file_path: "/docs/readme.txt",
    text_content: "hello",
  })

  const byQuery = await axios.get("/files/download", {
    params: { file_path: "/docs/readme.txt" },
  })
  expect(byQuery.status).toBe(200)
  expect(byQuery.data).toBe("hello")

  const byPath = await axios.get("/files/download/docs/readme.txt")
  expect(byPath.status).toBe(200)
  expect(byPath.data).toBe("hello")
})

test("download resolves . and .. segments", async () => {
  const { axios, url } = await getTestServer()
  await axios.post("/files/upsert", {
    file_path: "/a/b.txt",
    text_content: "nested",
  })

  const dotted = await axios.get("/files/download/a/./b.txt")
  expect(dotted.status).toBe(200)
  expect(dotted.data).toBe("nested")

  const traversed = await axios.get("/files/download/a/x/../b.txt")
  expect(traversed.status).toBe(200)
  expect(traversed.data).toBe("nested")

  const doubled = await fetch(`${url}/files/download/a//b.txt`)
  expect(doubled.status).toBe(200)
  expect(await doubled.text()).toBe("nested")

  const viaQuery = await axios.get("/files/download", {
    params: { file_path: "/a/../a/b.txt" },
  })
  expect(viaQuery.status).toBe(200)
  expect(viaQuery.data).toBe("nested")
})

test("download accepts a file_id", async () => {
  const { axios } = await getTestServer()
  const created = await axios.post("/files/upsert", {
    file_path: "/by-id.txt",
    text_content: "by id",
  })
  const fileId = created.data.file.file_id

  const res = await axios.get("/files/download", {
    params: { file_id: fileId },
  })
  expect(res.status).toBe(200)
  expect(res.data).toBe("by id")
})

test("download sets a usable Content-Disposition for awkward names", async () => {
  const { axios, url } = await getTestServer()
  await axios.post("/files/upsert", {
    file_path: '/odd/quo"te.txt',
    text_content: "x",
  })
  await axios.post("/files/upsert", {
    file_path: "/odd/ünïcode.txt",
    text_content: "y",
  })

  const quoted = await fetch(`${url}/files/download/odd/quo%22te.txt`)
  const quotedHeader = quoted.headers.get("content-disposition") ?? ""
  expect(quotedHeader).toContain('filename="quo_te.txt"')
  expect(quotedHeader).toContain("filename*=UTF-8''quo%22te.txt")

  const unicode = await fetch(`${url}/files/download/odd/ünïcode.txt`)
  expect(unicode.headers.get("content-disposition")).toContain(
    "filename*=UTF-8''%C3%BCn%C3%AFcode.txt",
  )
})

test("text downloads carry a Content-Length", async () => {
  const { axios, url } = await getTestServer()
  await axios.post("/files/upsert", {
    file_path: "/sized.txt",
    text_content: "12345",
  })

  const res = await fetch(`${url}/files/download/sized.txt`)
  expect(res.headers.get("content-length")).toBe("5")
})

test("missing files still 404", async () => {
  const { axios } = await getTestServer()
  await expect(axios.get("/files/download/nope.txt")).rejects.toThrow()
  await expect(
    axios.get("/files/download", { params: { file_path: "/nope.txt" } }),
  ).rejects.toThrow()
})
