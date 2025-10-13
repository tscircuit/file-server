import { test, expect } from "bun:test"
import { getTestServer } from "tests/fixtures/get-test-server"

test("custom events", async () => {
  const { axios } = await getTestServer()

  // Create a custom event
  const customEvent = {
    event_type: "USER_LOGIN",
    user_id: "123",
    ip_address: "192.168.1.1",
    success: true,
  }

  const createRes = await axios.post("/events/create", customEvent)
  expect(createRes.data.event.event_type).toBe("USER_LOGIN")
  expect(createRes.data.event.user_id).toBe("123")
  expect(createRes.data.event.ip_address).toBe("192.168.1.1")
  expect(createRes.data.event.success).toBe(true)

  // Verify event is in the list
  const listRes = await axios.get("/events/list")
  const createdEvent = listRes.data.event_list[0]
  expect(createdEvent.event_type).toBe("USER_LOGIN")
  expect(createdEvent.user_id).toBe("123")
  expect(createdEvent.ip_address).toBe("192.168.1.1")
  expect(createdEvent.success).toBe(true)
})

test("filter events by event_type", async () => {
  const { axios } = await getTestServer()

  await axios.post("/events/create", {
    event_type: "USER_LOGIN",
    user_id: "123",
  })

  await axios.post("/events/create", {
    event_type: "USER_LOGOUT",
    user_id: "123",
  })

  const listAllRes = await axios.get("/events/list")
  expect(listAllRes.data.event_list).toHaveLength(2)

  const filteredRes = await axios.get("/events/list", {
    params: { event_type: "USER_LOGIN" },
  })

  expect(filteredRes.data.event_list).toHaveLength(1)
  expect(filteredRes.data.event_list[0].event_type).toBe("USER_LOGIN")
  expect(filteredRes.data.event_list[0].user_id).toBe("123")
})

test("reset events", async () => {
  const { axios } = await getTestServer()

  // Create some events
  await axios.post("/events/create", {
    event_type: "USER_LOGIN",
    user_id: "123",
  })
  await axios.post("/events/create", {
    event_type: "USER_LOGIN",
    user_id: "456",
  })

  // Verify events exist
  let listRes = await axios.get("/events/list")
  expect(listRes.data.event_list).toHaveLength(2)

  // Reset events
  const resetRes = await axios.post("/events/reset")
  expect(resetRes.data.ok).toBe(true)

  // Verify events are cleared
  listRes = await axios.get("/events/list")
  expect(listRes.data.event_list).toHaveLength(0)
})
