import { test, expect } from "bun:test"
import { getTestServer } from "tests/fixtures/get-test-server"

test("custom events", async () => {
  const { ky } = await getTestServer()

  const customEvent = {
    event_type: "USER_LOGIN",
    user_id: "123",
    ip_address: "192.168.1.1",
    success: true,
  }

  const createData = await ky
    .post("events/create", { json: customEvent })
    .json<{ event: typeof customEvent }>()
  expect(createData.event.event_type).toBe("USER_LOGIN")
  expect(createData.event.user_id).toBe("123")
  expect(createData.event.ip_address).toBe("192.168.1.1")
  expect(createData.event.success).toBe(true)

  const listData = await ky.get("events/list").json<{ event_list: any[] }>()
  const createdEvent = listData.event_list[0]
  expect(createdEvent.event_type).toBe("USER_LOGIN")
  expect(createdEvent.user_id).toBe("123")
  expect(createdEvent.ip_address).toBe("192.168.1.1")
  expect(createdEvent.success).toBe(true)
})

test("filter events by event_type", async () => {
  const { ky } = await getTestServer()

  await ky.post("events/create", {
    json: { event_type: "USER_LOGIN", user_id: "123" },
  })

  await ky.post("events/create", {
    json: { event_type: "USER_LOGOUT", user_id: "123" },
  })

  const listAllData = await ky
    .get("events/list")
    .json<{ event_list: any[] }>()
  expect(listAllData.event_list).toHaveLength(2)

  const filteredData = await ky
    .get("events/list", {
      searchParams: { event_type: "USER_LOGIN" },
    })
    .json<{ event_list: any[] }>()

  expect(filteredData.event_list).toHaveLength(1)
  expect(filteredData.event_list[0].event_type).toBe("USER_LOGIN")
  expect(filteredData.event_list[0].user_id).toBe("123")
})

test("reset events", async () => {
  const { ky } = await getTestServer()

  await ky.post("events/create", {
    json: { event_type: "USER_LOGIN", user_id: "123" },
  })
  await ky.post("events/create", {
    json: { event_type: "USER_LOGIN", user_id: "456" },
  })

  let listData = await ky.get("events/list").json<{ event_list: any[] }>()
  expect(listData.event_list).toHaveLength(2)

  const resetData = await ky.post("events/reset").json<{ ok: boolean }>()
  expect(resetData.ok).toBe(true)

  listData = await ky.get("events/list").json<{ event_list: any[] }>()
  expect(listData.event_list).toHaveLength(0)
})
