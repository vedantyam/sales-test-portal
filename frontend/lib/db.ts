import { Pool } from 'pg'

const globalForDb = global as typeof globalThis & { db?: Pool }

if (!globalForDb.db) {
  globalForDb.db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
  })
}

export const db = globalForDb.db

export async function query(text: string, params?: any[]) {
  let attempts = 0
  while (attempts < 3) {
    try {
      return await db.query(text, params)
    } catch (err: any) {
      attempts++
      if (attempts === 3) throw err
      await new Promise((r) => setTimeout(r, 100 * attempts))
    }
  }
  throw new Error('DB query failed after 3 attempts')
}
