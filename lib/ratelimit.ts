import { Ratelimit } from '@upstash/ratelimit'
import { redis } from './redis'
import { NextRequest } from 'next/server'

// 10 note creations per minute per IP
export const createLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  prefix: 'ratelimit:create',
  analytics: false,
})

// 60 view/status requests per minute per IP (covers countdown polling)
export const viewLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '1 m'),
  prefix: 'ratelimit:view',
  analytics: false,
})

// 5 wrong-private-key attempts per note per IP per 5 minutes, then locked out.
// Keyed by slug+ip so it can't be used to lock other people out of a note.
export const wrongKeyLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '5 m'),
  prefix: 'ratelimit:wrongkey',
  analytics: false,
})

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? '127.0.0.1'
}
