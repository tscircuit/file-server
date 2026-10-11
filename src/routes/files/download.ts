/**
 * Download endpoint for tscircuit/file-server — Issue #5
 *
 * Adds two routes that serve file bytes with a Content-Disposition header so
 * browsers download rather than render:
 *   GET /files/download?file_path=<path>
 *   GET /files/download/<file_path>
 *
 * The handler reuses the file-store abstraction used by the existing /files
 * routes, validates the requested path (no traversal outside the store root),
 * and streams the file with the correct content-type.
 */
import { Hono } from 'hono'
import { getFileStore } from '../../lib/file-store'
import { contentTypeForPath } from '../../lib/content-type'

export const downloadRoutes = new Hono()

/** Reject absolute paths and any path containing `..` traversal segments. */
function isSafePath(filePath: string): boolean {
  if (!filePath) return false
  if (filePath.startsWith('/') || filePath.startsWith('\\')) return false
  const segments = filePath.split(/[\\/]+/)
  return !segments.includes('..')
}

async function handleDownload(c: any, rawPath: string | undefined) {
  const filePath = (rawPath ?? '').trim()

  if (!filePath) {
    return c.json({ error: 'Missing required parameter: file_path' }, 400)
  }
  if (!isSafePath(filePath)) {
    return c.json({ error: 'Invalid file_path: traversal is not allowed' }, 400)
  }

  const store = getFileStore()
  const file = await store.get(filePath)

  if (!file) {
    return c.json({ error: `File not found: ${filePath}` }, 404)
  }

  const filename = filePath.split(/[\\/]+/).pop() || 'download'
  const contentType = contentTypeForPath(filePath)

  return new Response(file.contents, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(file.contents.length),
      // `attachment` forces a download in the browser.
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}

// GET /files/download?file_path=...
downloadRoutes.get('/files/download', (c) => {
  return handleDownload(c, c.req.query('file_path'))
})

// GET /files/download/[[file_path]]  (wildcard, supports nested paths)
downloadRoutes.get('/files/download/*', (c) => {
  const wildcard = c.req.path.replace(/^\/files\/download\/?/, '')
  return handleDownload(c, decodeURIComponent(wildcard))
})
