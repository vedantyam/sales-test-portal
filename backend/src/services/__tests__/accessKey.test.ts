import { describe, it, expect } from 'vitest'
import { generateAccessKey, hashAccessKey, verifyAccessKey, getKeyPrefix } from '../accessKey'

describe('Access key', () => {
  it('generates 12-char uppercase key', () => {
    const key = generateAccessKey()
    expect(key).toHaveLength(12)
    expect(key).toBe(key.toUpperCase())
  })

  it('prefix is first 4 chars', () => {
    const key = 'ABCD12345678'
    expect(getKeyPrefix(key)).toBe('ABCD')
  })

  it('hash verifies correctly', async () => {
    const key = generateAccessKey()
    const hash = await hashAccessKey(key)
    expect(await verifyAccessKey(key, hash)).toBe(true)
    expect(await verifyAccessKey('WRONGKEY1234', hash)).toBe(false)
  })

  it('generates unique keys', () => {
    const keys = new Set(Array.from({ length: 20 }, () => generateAccessKey()))
    expect(keys.size).toBe(20)
  })
})
