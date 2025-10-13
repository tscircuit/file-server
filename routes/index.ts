import { withRouteSpec } from "lib/middleware/with-winter-spec"
import { z } from "zod"

export default withRouteSpec({
  methods: ["GET"],
  jsonResponse: z.any(),
})((req, ctx) => {
  return new Response(
    `<html><body>

<pre>
This is a simple file server API, it has the following API:

/health - Health check
/files/get?file_path=... - Get a file
/files/list - List all files
/files/upsert - Upsert a file

/events/list?since=... - List events since a given timestamp
/events/list?event_type=... - List events filtered by event type
</pre>


<h2>Admin Pages:</h2>
<pre>
<a href="/admin/files/list">Admin File List</a>
<a href="/admin/files/create">Admin File Create</a>
</pre>



</body></html>`,
    {
      headers: {
        "Content-Type": "text/html",
      },
    },
  )
})
