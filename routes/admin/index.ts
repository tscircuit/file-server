import { withRouteSpec } from "lib/middleware/with-winter-spec"
import { z } from "zod"

export default withRouteSpec({
  methods: ["GET"],
  jsonResponse: z.any(),
})((req, ctx) => {
  return new Response(
    `<html>
    <head>
      <title>file-server Admin Dashboard</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body>
      <div class="max-w-4xl mx-auto px-4 py-8">
        <h1 class="text-3xl font-bold mb-8">file-server Admin Dashboard</h1>
        <nav>
          <ul class="space-y-4">
            <li>
              <a href="./admin/files/list" class="block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">File Management</a>
            </li>
            <li>
              <a href="./admin/events/list" class="block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">Event Management</a>
            </li>
          </ul>
        </nav>
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
