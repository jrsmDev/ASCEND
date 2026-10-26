import { spawn, execSync } from 'node:child_process'
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
mkdirSync(path.join(root, 'data'), { recursive: true })

const SITE_PORT = 5174
const SITE_ROOT = path.join(root, 'website')

// Free the ports from any previous run.
try {
  execSync('powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000,5173,5174 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"', { stdio: 'ignore' })
} catch {}

const env = {
  ...process.env,
  PORT: '3000',
  RP_ID: 'localhost',
  ORIGIN: 'http://localhost:5173',
  RP_NAME: 'ASCEND',
  DATA_DIR: path.join(root, 'data'),
  API_TARGET: 'http://127.0.0.1:3000',
  API_ORIGIN: 'http://localhost:5173',
}

function prefix(stream, label, out) {
  let buf = ''
  stream.on('data', (chunk) => {
    buf += chunk.toString()
    let i
    while ((i = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, i).replace(/\r$/, '')
      out.write(`[${label}] ${line}\n`)
      buf = buf.slice(i + 1)
    }
  })
  stream.on('end', () => {
    if (buf) out.write(`[${label}] ${buf.replace(/\r$/, '')}\n`)
  })
}

function run(label, cwd, args) {
  const child = spawn('cmd.exe', ['/c', 'npm', ...args], {
    cwd,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })
  prefix(child.stdout, label, process.stdout)
  prefix(child.stderr, label, process.stderr)
  return child
}

/* The marketing site is static, so it needs no bundler and no second terminal. Serving it
   here keeps `run.bat` a single window, and gives the app a fixed local download URL:
   http://localhost:5174/#download. The demo iframe points at the app on :5173. */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.yaml': 'application/yaml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.apk': 'application/vnd.android.package-archive',
}

function serveSite(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' })
    res.end('Method not allowed')
    return
  }

  let pathname
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
  } catch {
    res.writeHead(400)
    res.end('Bad request')
    return
  }

  if (pathname.endsWith('/')) pathname += 'index.html'
  let file = path.normalize(path.join(SITE_ROOT, pathname))
  if (file !== SITE_ROOT && !file.startsWith(SITE_ROOT + path.sep)) {
    res.writeHead(403)
    res.end('Forbidden')
    return
  }
  if (!existsSync(file) && !path.extname(file)) {
    const html = file + '.html'
    if (existsSync(html)) file = html
  }
  if (!existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Not found')
    return
  }

  const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream'
  const { size } = statSync(file)
  res.writeHead(200, {
    'Content-Type': type,
    'Content-Length': size,
    'Cache-Control': 'no-cache',
  })
  if (req.method === 'HEAD') return res.end()
  createReadStream(file).pipe(res)
}

const site = http.createServer(serveSite)
let api = null
let web = null
let stopping = false

// npm is started through cmd.exe on Windows, so child.kill() would close the wrapper and
// leave Vite and the API running. /T takes the whole tree with it.
function killTree(child) {
  if (!child || child.killed) return
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore', windowsHide: true })
    } else {
      child.kill('SIGTERM')
    }
  } catch {}
}

function stop() {
  if (stopping) return
  stopping = true
  console.log('\nStopping ASCEND services...')
  try { site.close() } catch {}
  try { site.closeAllConnections() } catch {}
  killTree(api)
  killTree(web)
}

site.on('error', (err) => {
  console.error(`[site] could not start: ${err.message}`)
  stop()
})
site.listen(SITE_PORT, '127.0.0.1', () => {
  console.log(`Site: http://localhost:${SITE_PORT}`)
})

api = run('api', path.join(root, 'api'), ['start'])
web = run('web', path.join(root, 'frontend'), ['run', 'dev'])
process.on('SIGINT', stop)
process.on('SIGTERM', stop)

api.on('exit', (code) => {
  if (!stopping) {
    console.log(`[api] exited with code ${code}`)
    stop()
  }
})
web.on('exit', (code) => {
  if (!stopping) {
    console.log(`[web] exited with code ${code}`)
    stop()
  }
})

console.log('ASCEND starting...')
console.log('API:  http://localhost:3000')
console.log('Web:  http://localhost:5173')
console.log('Press Ctrl+C to stop all three.\n')
