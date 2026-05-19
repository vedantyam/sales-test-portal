import crypto from 'crypto'
import bcrypt from 'bcrypt'

const ROUNDS = 12

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
