# @tscircuit/file-server

A simple file server with REST API and event bus capabilities for managing text files.

## Installation

```bash
npm install @tscircuit/file-server
# or
bun add @tscircuit/file-server
```

## Command Line Usage

Start the server:

```bash
# Start with default port 3062
file-server

# Start with custom port
PORT=8080 file-server
```

## Library Usage

```typescript
import winterspecBundle from "@tscircuit/file-server"
import { startServer } from "winterspec/adapters/node"

const server = await startServer(winterspecBundle, {
  port: 3062,
})
```

## API Documentation

### File Operations

#### Create/Update File

```http
POST /files/upsert
Content-Type: application/json

{
  "file_id": "optional-id",
  "file_path": "path/to/file.txt",
  "text_content": "File contents here" // or use "binary_content_b64": "..."
}

Response: {
  "file": {
    "file_id": "1",
    "file_path": "path/to/file.txt",
    "text_content": "File contents here",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

The returned file will contain either `text_content` or `binary_content_b64`.

Provide either `text_content` for text files or `binary_content_b64` for
binary data. The response will include whichever field was supplied.

#### Add Binary Files

To upload binary assets (for example, images or compiled artifacts) encode the
file contents as Base64 and provide them via the `binary_content_b64` field.

```http
POST /files/upsert
Content-Type: application/json

{
  "file_path": "assets/logo.png",
  "binary_content_b64": "iVBORw0KGgoAAAANSUhEUgAA..."
}

Response: {
  "file": {
    "file_id": "42",
    "file_path": "assets/logo.png",
    "binary_content_b64": "iVBORw0KGgoAAAANSUhEUgAA...",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

The server persists the binary payload exactly as provided. When retrieving the
file with `/files/get`, the same `binary_content_b64` string will be returned
and can be decoded back to the original bytes in your client code.

#### Get File

```http
GET /files/get?file_id=1
# or
GET /files/get?file_path=path/to/file.txt

Response: {
  "file": {
    "file_id": "1",
    "file_path": "path/to/file.txt",
    "text_content": "File contents here",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

#### List Files

```http
GET /files/list

Response: {
  "file_list": [
    {
      "file_id": "1",
      "file_path": "path/to/file.txt"
    }
  ]
}
```

### Event Operations

#### Create Event

```http
POST /events/create
Content-Type: application/json

{
  "event_type": "FILE_UPDATED",
  "file_path": "path/to/file.txt"
}

Response: {
  "event": {
    "event_id": "2",
    "event_type": "FILE_UPDATED",
    "file_path": "path/to/file.txt",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

#### List Events

```http
GET /events/list
# or
GET /events/list?since=2024-01-01T00:00:00.000Z
# or
GET /events/list?event_type=FILE_UPDATED

Response: {
  "event_list": [
    {
      "event_id": "2",
      "event_type": "FILE_UPDATED",
      "file_path": "path/to/file.txt",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

You can optionally combine `since` and `event_type` to narrow the response to
events of a specific type that were created after a given timestamp.

### Admin Interface

The server includes a web-based admin interface for managing files:

- `/admin/files/list` - View all files
- `/admin/files/create` - Create new files
- `/admin/files/get?file_path=...` - View file details

## Event Types

Built-in event types:

- `FILE_UPDATED` - Triggered when a file is created or updated

You can create custom event types by using the `/events/create` endpoint with your own event type names.

## Development

```bash
# Start development server
bun run dev

# Run tests
bun test

# Build for production
bun run build
```
