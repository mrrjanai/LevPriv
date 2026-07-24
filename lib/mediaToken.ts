import crypto from 'crypto'

// How long a media token stays valid after being issued (on successful note
// reveal). Generous enough to allow a full watch/listen/seek session, short
// enough that a leaked token isn't useful for long.
const MEDIA_TOKEN_TTL_MS = 15 * 60 * 1000

function secret(): string {
  const key = process.env.SERVER_ENCRYPTION_KEY
  if (!key) throw new Error('SERVER_ENCRYPTION_KEY is not set.')
  return key
}

export function issueMediaToken(slug: string): string {
  const expires = Date.now() + MEDIA_TOKEN_TTL_MS
  const payload = `${slug}.${expires}`
  const sig = crypto.createHmac('sha256', secret()).update(payload).digest('hex')
  return `${expires}.${sig}`
}

export function verifyMediaToken(slug: string, token: string | null): boolean {
  if (!token) return false
  const parts = token.split('.')
  if (parts.length !== 2) return false
  const [expiresStr, sig] = parts
  const expires = Number(expiresStr)
  if (!Number.isFinite(expires) || !sig) return false
  if (Date.now() > expires) return false

  const payload = `${slug}.${expires}`
  const expectedSig = crypto.createHmac('sha256', secret()).update(payload).digest('hex')

  const a = Buffer.from(sig)
  const b = Buffer.from(expectedSig)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}