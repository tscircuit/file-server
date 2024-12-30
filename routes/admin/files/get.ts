import { withRouteSpec } from "lib/middleware/with-winter-spec"
import { z } from "zod"

export default withRouteSpec({
  methods: ["GET"],
  queryParams: z.object({
    file_path: z.string(),
  }),
  jsonResponse: z.any(),
})((req, ctx) => {
  const { file_path } = req.query
  const file = ctx.db.getFile({ file_path })

  if (!file) {
    return new Response("File not found", { status: 404 })
  }

  return new Response(
    `<html>
    <head>
      <title>File Details - ${file.file_path}</title>
      <style>
        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
        .details { margin-bottom: 20px; }
        .label { font-weight: bold; }
        pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; }
        a { color: #0066cc; text-decoration: none; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <div class="container">
        <p><a href="./list">← Back to file list</a></p>
        <h1>File Details</h1>
        <div class="details">
          <p><span class="label">File ID:</span> ${file.file_id}</p>
          <p><span class="label">File Path:</span> ${file.file_path}</p>
          <p><span class="label">Created At:</span> ${file.created_at}</p>
        </div>
        <h2>Content:</h2>
        <pre>${file.text_content}</pre>
      </div>
    </body>
    </html>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    },
  )
})
