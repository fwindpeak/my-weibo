import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
const KEY_LENGTH = 64
const SALT_LENGTH = 16

export async function hashPassword(password: string) {
  const salt = randomBytes(SALT_LENGTH)
  const derivedKey = scryptSync(password, salt, KEY_LENGTH)
  return `${salt.toString('hex')}:${derivedKey.toString('hex')}`
}

export async function verifyPassword(password: string, storedHash: string) {
  const [saltHex, keyHex] = storedHash.split(':')
  if (!saltHex || !keyHex) {
    return false
  }

  const salt = Buffer.from(saltHex, 'hex')
  const expectedKey = Buffer.from(keyHex, 'hex')
  const derivedKey = scryptSync(password, salt, KEY_LENGTH)

  if (expectedKey.length !== derivedKey.length) {
    return false
  }

  return timingSafeEqual(expectedKey, derivedKey)
}
