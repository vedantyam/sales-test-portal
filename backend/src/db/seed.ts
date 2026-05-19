import 'dotenv/config'
import { db } from './client'
import { runMigrations } from './migrate'
import bcrypt from 'bcrypt'

async function seed() {
  await runMigrations()

  const email = process.env.SEED_ADMIN_EMAIL!
  const password = process.env.SEED_ADMIN_PASSWORD!
  const name = process.env.SEED_ADMIN_NAME || 'Super Admin'

  const { rows: existing } = await db.query('SELECT id FROM admins WHERE email=$1', [email])
  if (existing[0]) {
    console.log('Admin already exists:', email)
    await db.end()
    process.exit(0)
  }

  const hash = await bcrypt.hash(password, 12)
  await db.query(
    'INSERT INTO admins (name, email, password_hash) VALUES ($1,$2,$3)',
    [name, email.toLowerCase(), hash]
  )

  console.log('Admin seeded:', email)
  await db.end()
  process.exit(0)
}

seed().catch((e) => { console.error(e); process.exit(1) })
