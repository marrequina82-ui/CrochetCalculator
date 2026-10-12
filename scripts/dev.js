import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const clientDirectory = fileURLToPath(new URL('../Crochetclient/', import.meta.url))
const children = []
let stopping = false

function stop(code = 0) {
  if (stopping) return
  stopping = true
  process.exitCode = code
  for (const child of children) if (child.exitCode === null) child.kill('SIGTERM')
}

function start(name, args, cwd) {
  const child = spawn(process.execPath, args, { cwd, stdio: 'inherit', env: process.env })
  children.push(child)
  child.on('error', error => {
    console.error(`${name} could not start: ${error.message}`)
    stop(1)
  })
  child.on('exit', (code, signal) => {
    if (!stopping) {
      console.error(`${name} stopped (${signal || code}). Stopping the development servers.`)
      stop(code || 1)
    }
  })
}

process.on('SIGINT', () => stop())
process.on('SIGTERM', () => stop())

console.log('Starting the Supabase API and React app. Open http://localhost:5173. Press Ctrl+C to stop both.')
start('Backend', ['--env-file-if-exists=.env', 'Crochetserver/server.js'], root)
start('Frontend', ['node_modules/vite/bin/vite.js'], clientDirectory)
