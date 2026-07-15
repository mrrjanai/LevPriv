import { Redis } from '@upstash/redis'

// Uses UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from env automatically
// when using Redis.fromEnv(), which matches the variable names Vercel's
// Upstash integration injects.
export const redis = Redis.fromEnv()

export const noteKey = (slug: string) => `note:${slug}`
