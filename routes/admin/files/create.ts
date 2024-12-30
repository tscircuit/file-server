import { withRouteSpec } from "lib/middleware/with-winter-spec"
import { z } from "zod"

export default withRouteSpec({
  methods: ["GET", "POST"],
  jsonResponse: z.any(),
})(async (req, ctx) => {
  if (req.method === "POST") {
    const formData = await req.formData()
    const file_path = formData.get("file_path")?.toString() || ""
    const text_content = formData.get("text_content")?.toString() || ""

    await fetch(`${req.url.split("/admin")[0]}/files/upsert`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file_path,
        text_content,
      }),
    })

    return new Response(null, {
      status: 302,
      headers: {
        Location: "/admin/files/list",
      },
    })
  }

  return new Response(
    `<html>
    <head>
      <title>Create New File</title>
      <style>
        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input[type="text"], textarea {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        textarea { height: 200px; font-family: monospace; }
        button {
          background-color: #4CAF50;
          color: white;
          padding: 10px 15px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        button:hover { background-color: #45a049; }
        a { color: #0066cc; text-decoration: none; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <div class="container">
        <p><a href="/admin/files/list">← Back to file list</a></p>
        <h1>Create New File</h1>
        <form method="POST">
          <div class="form-group">
            <label for="file_path">File Path:</label>
            <input type="text" id="file_path" name="file_path" required>
          </div>
          <div class="form-group">
            <label for="text_content">Content:</label>
            <textarea id="text_content" name="text_content" required></textarea>
          </div>
          <button type="submit">Create File</button>
        </form>
      </div>
    </body>
    </html>`,
    {
      headers: {
        "Content-Type": "text/html",
      },
    },
  )
})
