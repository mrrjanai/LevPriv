import { NextRequest, NextResponse } from 'next/server'
import { redis, noteKey } from '@/lib/redis'
import { verifyMediaToken } from '@/lib/mediaToken'
import { viewLimiter, getClientIp } from '@/lib/ratelimit'
import type { StoredNote } from '@/lib/types'

export const runtime = 'nodejs'

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const ip = getClientIp(req)
  const { success } = await viewLimiter.limit(ip)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })
  }

  const token = req.nextUrl.searchParams.get('vt')
  if (!verifyMediaToken(params.slug, token)) {
    return NextResponse.json({ error: 'Invalid or expired media link.' }, { status: 403 })
  }

  const note = await redis.get<StoredNote>(noteKey(params.slug))
  if (!note || !note.attachment) {
    return NextResponse.json({ error: 'Media not found.' }, { status: 404 })
  }

  // Forward the Range header so video/audio scrubbing works properly -
  // Vercel Blob's underlying storage supports partial content natively.
  const rangeHeader = req.headers.get('range')
  const upstream = await fetch(note.attachment.blobUrl, {
    headers: rangeHeader ? { range: rangeHeader } : {},
  })

  if (!upstream.ok && upstream.status !== 206) {
    return NextResponse.json({ error: 'Media unavailable.' }, { status: 502 })
  }

  const headers = new Headers()
  headers.set('Content-Type', note.attachment.mimeType)
  // 'inline' (not 'attachment') so the browser renders it in place instead
  // of triggering a save-file dialog. This is a deterrent, not a lock -
  // see the note in the README about the real limits of this approach.
  headers.set(
    'Content-Disposition',
    `inline; filename="${encodeURIComponent(note.attachment.fileName)}"`
  )
  headers.set('Cache-Control', 'no-store')
  headers.set('X-Content-Type-Options', 'nosniff')

  const passthroughHeaders = ['accept-ranges', 'content-range', 'content-length']
  for (const h of passthroughHeaders) {
    const value = upstream.headers.get(h)
    if (value) headers.set(h, value)
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers,
  })
}