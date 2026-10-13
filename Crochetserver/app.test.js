import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { createHandler, validateProject, publicItem } from './app.js'
import { transaction } from './database.js'

const valid = () => ({ name: 'Fish', yarn: '15', materials: '10', hours: '0.2', rate: '50', overhead: '10', profit: '25', currency: 'PHP', status: 'Completed', pattern: '', image: '', category: 'Crochet', sold: 0, sales: [] })
test('project validation rejects invalid costs, injected IDs and disguised photos', () => {
  assert.throws(() => validateProject({ ...valid(), rate: '-1' }), /Invalid rate/)
  assert.throws(() => validateProject({ ...valid(), yarn: 'Infinity' }), /Invalid yarn/)
  assert.throws(() => validateProject({ ...valid(), image: 'data:image/png;base64,aGVsbG8=' }), /Invalid photo/)
  assert.deepEqual(validateProject({ ...valid(), id: 9, stock: 10 }), valid())
})
test('catalog calculates price and excludes private fields', () => {
  const item = publicItem({ id: '3', stock: 10, data: valid() })
  assert.equal(item.price, 48.13)
  assert.deepEqual(Object.keys(item).sort(), ['category','currency','id','image','name','price','stock'])
})
test('failed mutations roll back and release the same connection', async () => {
  const calls = []
  const client = { query: async sql => calls.push(sql), release: () => calls.push('release') }
  await assert.rejects(transaction({ connect: async () => client }, async c => { assert.equal(c, client); throw new Error('conflict') }), /conflict/)
  assert.deepEqual(calls, ['BEGIN','ROLLBACK','release'])
})
test('HTTP health, authentication, origin protection, stock conflicts and actor attribution', async t => {
  const calls = []
  const database = {
    query: async (sql, values) => {
      calls.push([sql, values])
      return { rows: sql.startsWith('SELECT u.id') || sql.startsWith('SELECT id,email FROM (') ? [{ id: '2', email: 'admin@example.com' }] : [] }
    },
    release() {},
    async connect() { return this },
  }
  const server = createServer(createHandler(() => database))
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise(resolve => server.close(resolve)))
  const base = `http://127.0.0.1:${server.address().port}`
  assert.equal((await fetch(`${base}/api/health`)).status, 200)
  assert.equal((await fetch(`${base}/api/projects`)).status, 401)
  const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pin: '012345' }) })
  assert.equal(login.status, 200)
  assert.match(login.headers.get('set-cookie'), /stitch_session=[a-f0-9]{64};.*HttpOnly; SameSite=Strict/)
  assert.deepEqual(await login.json(), { id: 2, email: 'admin@example.com' })
  assert.ok(calls.some(([sql, values]) => sql.startsWith('INSERT INTO sessions') && /^[a-f0-9]{64}$/.test(values[0])))
  const logout = await fetch(`${base}/api/auth/logout`, { method: 'POST', headers: { cookie: login.headers.get('set-cookie').split(';')[0] } })
  assert.equal(logout.status, 200)
  assert.match(logout.headers.get('set-cookie'), /Max-Age=0/)
  assert.equal((await fetch(`${base}/api/auth/logout`, { method: 'POST', headers: { origin: 'https://foreign.example' } })).status, 403)
  const headers = { cookie: `stitch_session=${'a'.repeat(64)}`, 'content-type': 'application/json' }
  assert.equal((await fetch(`${base}/api/projects/3/stock`, { method: 'PATCH', headers, body: JSON.stringify({ stock: 12, previous: 10 }) })).status, 409)
  assert.ok(calls.some(([sql, values]) => sql.includes('set_config') && values[0] === '2'))
  assert.ok(calls.some(([sql, values]) => sql.includes('AND stock=$3') && values[2] === 10))
  assert.ok(calls.some(([sql]) => sql === 'ROLLBACK'))
  assert.equal((await fetch(`${base}/api/projects/3/stock`, { method: 'PATCH', headers, body: JSON.stringify({ stock: 1.5, previous: 10 }) })).status, 400)
})
