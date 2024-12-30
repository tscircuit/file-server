import { withRouteSpec } from "lib/middleware/with-winter-spec"
import { z } from "zod"

export default withRouteSpec({
  methods: ["GET"],
  jsonResponse: z.any(),
})((req, ctx) => {
  const files = ctx.db.files

  return new Response(
    `<html>
    <head>
      <title>File List</title>
      <style>
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        tr:nth-child(even) { background-color: #f2f2f2; }
        th { background-color: #4CAF50; color: white; }
        a { color: #0066cc; text-decoration: none; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <h1>Files</h1>
      <p><a href="./create" style="background-color: #4CAF50; color: white; padding: 10px 15px; border-radius: 4px; text-decoration: none; display: inline-block; margin-bottom: 20px;">Create New File</a></p>
      <table>
        <tr>
          <th>File Path</th>
          <th>Actions</th>
        </tr>
        ${files
          .map(
            (file) => `
          <tr>
            <td>${file.file_path}</td>
            <td>
              <a href="/admin/files/get?file_path=${encodeURIComponent(file.file_path)}">View Details</a>
            </td>
          </tr>
        `,
          )
          .join("")}
      </table>
    </body>
    </html>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    },
  )
})
