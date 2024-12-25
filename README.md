# simple-fs-server

The API uses an event bus architecture and a system for updating files, here are the endpoints

```
POST /files/upsert
REQUEST: { file_id?, text_content, file_path }
RESPONSE: { file: { file_id, file_path, text_content } }

GET /files/get?file_id?&file_path?
RESPONSE: { file: { file_id, file_path, text_content } }

GET /files/list
RESPONSE { file_list: Array<{ file_id, file_path } }

GET /events/list?since=<iso timestamp>
RESPONSE { event_list: Array<{ event_id, created_at, event_type, ... }> }

POST /events/create
REQUEST { event_type: "..." }
RESPONSE { event: { event_id, ... } }
```

The only `event_type` is `FILE_UPDATED`. Here's an example event:

`{ event_id: "...", event_type: "FILE_UPDATED", file_path: "path/to/file.txt", created_at: "..." }`

You can create your own event types and use the message bus is helpful.
