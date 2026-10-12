import pg from 'pg'
import { readFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { createSupabaseDatabase } from './supabase.js'

let pool
export function getDatabase() {
  if (process.env.SUPABASE_URL) return pool ||= createSupabaseDatabase()
  if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL to your Supabase connection URL.')
  if (!pool) {
    const url = new URL(process.env.DATABASE_URL)
    for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) url.searchParams.delete(key)
    pool = new pg.Pool({ connectionString: url.toString(), ssl: { rejectUnauthorized: true,
      ca: process.env.SUPABASE_CA_CERT
        ? process.env.SUPABASE_CA_CERT.replaceAll('\\n', '\n')
        : readFileSync(new URL('./certs/supabase-ca.crt', import.meta.url), 'utf8') },
      max: 5, connectionTimeoutMillis: 8000, idleTimeoutMillis: 10000,
      statement_timeout: 8000, options: '-c search_path=public,extensions' })
    pool.on('error', () => console.error('An idle database connection failed.'))
  }
  return pool
}

export async function transaction(database, callback) {
  const client = await database.connect()
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally { client.release() }
}

export async function initializeDatabase() {
  if (process.env.SUPABASE_URL) { await getDatabase().rpc('check'); return }
  const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8')
  await transaction(getDatabase(), client => client.query(schema))
}
