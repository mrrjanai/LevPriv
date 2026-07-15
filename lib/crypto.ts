import crypto from 'crypto'

const ALGO = 'aes-256-gcm'
const IV_LENGTH = 12
const SALT_LENGTH = 16
const PBKDF2_ITERATIONS = 210_000

function getServerKey(): Buffer {
  const secret = process.env.SERVER_ENCRYPTION_KEY
  if (!secret || secret.length < 32) {
    throw new Error(
      'SERVER_ENCRYPTION_KEY is missing or too short. Set a 64-char hex string in your environment variables.'
    )
  }
  // Derive a stable 32-byte key from the configured secret.
  return crypto.createHash('sha256').update(secret).digest()
}

function deriveKeyFromPassphrase(passphrase: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(passphrase, salt, PBKDF2_ITERATIONS, 32, 'sha256')
}

export interface EncryptResult {
  cipherText: string
  iv: string
  authTag: string
  salt: string | null
}

/**
 * Encrypts note content.
 * - If a privateKey (passphrase) is supplied, a random salt is generated and
 *   the encryption key is derived from the passphrase via PBKDF2. The server
 *   never stores the passphrase, so it cannot decrypt the note without it.
 * - Otherwise, the note is encrypted with a key derived from the server-only
 *   SERVER_ENCRYPTION_KEY, protecting data at rest in Redis.
 */
export function encryptContent(content: string, privateKey?: string): EncryptResult {
  const iv = crypto.randomBytes(IV_LENGTH)
  let key: Buffer
  let salt: Buffer | null = null

  if (privateKey && privateKey.length > 0) {
    salt = crypto.randomBytes(SALT_LENGTH)
    key = deriveKeyFromPassphrase(privateKey, salt)
  } else {
    key = getServerKey()
  }

  const cipher = crypto.createCipheriv(ALGO, key, iv)
  const encrypted = Buffer.concat([cipher.update(content, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return {
    cipherText: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    salt: salt ? salt.toString('base64') : null,
  }
}

export interface DecryptInput {
  cipherText: string
  iv: string
  authTag: string
  salt: string | null
  privateKey?: string
}

/**
 * Decrypts note content. Throws if the passphrase is wrong or data was tampered with.
 */
export function decryptContent(input: DecryptInput): string {
  const iv = Buffer.from(input.iv, 'base64')
  const authTag = Buffer.from(input.authTag, 'base64')
  const cipherText = Buffer.from(input.cipherText, 'base64')

  let key: Buffer
  if (input.salt) {
    if (!input.privateKey) {
      throw new Error('This note requires a private key to decrypt.')
    }
    key = deriveKeyFromPassphrase(input.privateKey, Buffer.from(input.salt, 'base64'))
  } else {
    key = getServerKey()
  }

  const decipher = crypto.createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(authTag)
  const decrypted = Buffer.concat([decipher.update(cipherText), decipher.final()])
  return decrypted.toString('utf8')
}

export function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

export function generateOwnerToken(): string {
  return crypto.randomBytes(24).toString('base64url')
}
