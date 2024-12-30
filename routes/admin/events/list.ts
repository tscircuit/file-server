import { withRouteSpec } from "lib/middleware/with-winter-spec"
import { z } from "zod"

export default withRouteSpec({
  methods: ["GET"],
  jsonResponse: z.any(),
})((req, ctx) => {
  const events = ctx.db.events

  return new Response(
    `<html>
    <head>
      <title>Events List</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body>
      <div class="p-4">
        <h1 class="text-3xl font-bold mb-8">Events</h1>
        <table class="w-full border-collapse border border-gray-300">
          <thead>
            <tr class="bg-gray-100">
              <th class="border border-gray-300 p-2">Event Type</th>
              <th class="border border-gray-300 p-2">Created At</th>
              <th class="border border-gray-300 p-2">Details</th>
            </tr>
          </thead>
          <tbody>
            ${events
              .sort(
                (a, b) =>
                  new Date(b.created_at).valueOf() -
                  new Date(a.created_at).valueOf(),
              )
              .map(
                ({ event_type, event_id, created_at, ...rest }) => `
              <tr>
                <td class="border border-gray-300 p-2">${event_type}</td>
                <td class="border border-gray-300 p-2">${new Date(
                  created_at,
                ).toLocaleString()}</td>
                <td class="border border-gray-300 p-2">${JSON.stringify(rest)
                  .slice(1, -1)
                  .replace(/"([^"]+)":/g, "$1:")}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
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
