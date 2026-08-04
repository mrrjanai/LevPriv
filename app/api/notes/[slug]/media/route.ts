import { NextRequest, NextResponse } from 'next/server'
import { redis, noteKey } from '@/lib/redis'
import { verifyMediaToken } from '@/lib/mediaToken'
import { viewLimiter, getClientIp } from '@/lib/ratelimit'
import { get } from '@vercel/blob'
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

  const result = await get(note.attachment.blobPathname, { access: 'private' })
  if (!result) {
    return NextResponse.json({ error: 'Media unavailable.' }, { status: 404 })
  }

  const headers = new Headers()
  headers.set('Content-Type', note.attachment.mimeType)
  headers.set(
    'Content-Disposition',
    `inline; filename="${encodeURIComponent(note.attachment.fileName)}"`
  )
  headers.set('Cache-Control', 'no-store')
  headers.set('X-Content-Type-Options', 'nosniff')

  return new NextResponse(result.stream, {
    status: 200,
    headers,
  })
}