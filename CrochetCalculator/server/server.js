import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { join, extname, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import handler from './app.js'
import { initializeDatabase } from './database.js'

const clientDist = fileURLToPath(new URL('../client/dist', import.meta.url))

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function serveStatic(req, res) {
  if (!existsSync(clientDist)) return false

  const url = new URL(req.url, 'http://localhost')
  const pathname = decodeURIComponent(url.pathname)

  const relativePath = normalize(pathname).replace(/^(\.\.[/\\])+/, '').replace(/^[/\\]+/, '')
  let filePath = join(clientDist, relativePath)
  let isFile = false

  if (existsSync(filePath)) {
    try {
      const stat = statSync(filePath)
      if (stat.isFile()) isFile = true
    } catch {}
  }

  if (!isFile && (!extname(pathname) || pathname === '/')) {
    filePath = join(clientDist, 'index.html')
    isFile = existsSync(filePath)
  }

  if (isFile) {
    const ext = extname(filePath).toLowerCase()
    res.statusCode = 200
    res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream')
    if (ext === '.html') {
      res.setHeader('Cache-Control', 'no-cache')
    } else {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    }
    createReadStream(filePath).pipe(res)
    return true
  }

  return false
}

function requestListener(req, res) {
  const url = new URL(req.url, 'http://localhost')
  if (url.pathname.startsWith('/api/') || url.pathname === '/api') {
    return handler(req, res)
  }
  if (serveStatic(req, res)) {
    return
  }
  return handler(req, res)
}

try {
  if (!process.env.SUPABASE_URL?.trim() && !process.env.DATABASE_URL?.trim()) {
    console.error('Set SUPABASE_URL and SUPABASE_SECRET_KEY in the root .env, then run npm run dev again.')
    process.exit(1)
  }
  await initializeDatabase()
  const host = process.env.HOST || (process.env.PORT ? '0.0.0.0' : '127.0.0.1')
  const port = Number(process.env.PORT || 8080)
  const server = createServer(requestListener)
  server.requestTimeout = 30000
  server.headersTimeout = 10000
  server.listen(port, host, () => console.log(`MZ Crafties server listening on http://${host}:${port}`))
} catch (error) {
  const cause = error.cause?.message || error.cause?.code || ''
  console.error('Could not initialize Supabase:', error.code || error.name, cause ? `(${cause})` : '')
  if (error.cause?.code === 'ENOTFOUND' || cause.includes('ENOTFOUND') || error.message === 'fetch failed') {
    console.error(
      'Cannot reach Supabase host. Possible reasons:\n' +
      '  1. The Supabase project is paused. Go to your Supabase dashboard (https://supabase.com/dashboard) and unpause/restore your project.\n' +
      '  2. The SUPABASE_URL in your root .env is invalid or expired. Check Project Settings > API in your Supabase dashboard.\n' +
      '  3. Check your internet connection.'
    )
  }
  if (error.code === 'PGRST202') console.error('Run server/schema.sql, then server/supabase-api.sql in the Supabase SQL Editor.')
  if (!error.code && error.message !== 'fetch failed') console.error(error.message)
  if (error.code === '28P01') {
    console.error('Supabase rejected the database login. Update DATABASE_URL in .env with the correct database password (URL-encoded), or reset the database password in Supabase Database Settings.')
  }
  process.exitCode = 1
}
