import { test, expect } from "bun:test"
import { getTestServer } from "tests/fixtures/get-test-server"

test("custom events", async () => {
  const { axios } = await getTestServer()

  // Create a custom event
  const customEvent = {
    event_type: "USER_LOGIN",
    user_id: "123",
    ip_address: "192.168.1.1",
    success: true
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
