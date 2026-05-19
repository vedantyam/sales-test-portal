import crypto from 'crypto'
import bcrypt from 'bcrypt'

const ROUNDS = 12

function encryptionKey(): Buffer {
  return crypto.createHash('sha256').update(process.env.JWT_ACCESS_SECRET || 'fallback-dev-secret').digest()
}

export function generateAccessKey(): string {
  return crypto.randomBytes(9).toString('base64url').substring(0, 12).toUpperCase()
}

export function getKeyPrefix(key: string): string {
  return key.substring(0, 4)
}

export async function hashAccessKey(key: string): Promise<string> {
  return bcrypt.hash(key, ROUNDS)
}

export async function verifyAccessKey(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

export function encryptKey(plainKey: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey(), iv)
  let encrypted = cipher.update(plainKey, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

export function decryptKey(encryptedKey: string): string {
  const [ivHex, encrypted] = encryptedKey.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-cbc', encryptionKey(), iv)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}
