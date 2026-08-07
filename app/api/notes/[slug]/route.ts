import { NextRequest, NextResponse } from 'next/server'
import { redis, noteKey } from '@/lib/redis'
import { decryptContent, sha256Hex } from '@/lib/crypto'
import { viewLimiter, wrongKeyLimiter, getClientIp } from '@/lib/ratelimit'
import { MAX_DURATION_SECONDS } from '@/lib/duration'
import { issueMediaToken } from '@/lib/mediaToken'
import { deleteBlobSafely } from '@/lib/blob'
import { generateViewId } from '@/lib/crypto'
import type {
  StoredNote,
  NotePublicMeta,
  ExtendNoteRequest,
  ExtendNoteResponse,
  RevealNoteResponse,
  PublicAttachmentMeta,
} from '@/lib/types'

export const runtime = 'nodejs'

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function loadNote(slug: string): Promise<StoredNote | null> {
  const note = await redis.get<StoredNote>(noteKey(slug))
  return note ?? null
}

function isExpired(note: StoredNote): boolean {
  return Date.now() >= note.expiresAt
}

function toPublicAttachment(note: StoredNote): PublicAttachmentMeta | null {
  if (!note.attachment) return null
  const { kind, mimeType, fileName, sizeBytes } = note.attachment
  return { kind, mimeType, fileName, sizeBytes }
}

async function cleanupIfGone(note: StoredNote | null): Promise<void> {
  if (note && (note.deleted || isExpired(note)) && note.attachment) {
    await deleteBlobSafely(note.attachment.blobPathname)
  }
}

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const ip = getClientIp(req)
  const { success } = await viewLimiter.limit(ip)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests. Slow down.' }, { status: 429 })
  }

  const note = await loadNote(params.slug)
  await cleanupIfGone(note)

  if (!note || note.deleted || isExpired(note)) {
    const meta: NotePublicMeta = {
      exists: false,
      expired: note ? isExpired(note) : true,
      deleted: note?.deleted ?? false,
      hasPrivateKey: false,
    }
    return NextResponse.json(meta, { status: 200 })
  }

  const token = req.nextUrl.searchParams.get('token')
  const isOwner = Boolean(token && sha256Hex(token) === note.ownerTokenHash)

  const meta: NotePublicMeta = {
    exists: true,
    expired: false,
    deleted: false,
    hasPrivateKey: note.hasPrivateKey,
    burnAfterReading: note.burnAfterReading,
    attachment: toPublicAttachment(note),
    expiresAt: note.expiresAt,
    createdAt: note.createdAt,
    views: isOwner ? note.views : undefined,
  }

  return NextResponse.json(meta, { status: 200 })
}

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const ip = getClientIp(req)
  const { success } = await viewLimiter.limit(ip)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests. Slow down.' }, { status: 429 })
  }

  const note = await loadNote(params.slug)
  await cleanupIfGone(note)

  if (!note || note.deleted || isExpired(note)) {
    return NextResponse.json(
      { error: 'This note has self-destructed or never existed.' },
      { status: 404 }
    )
  }

  let privateKey: string | undefined
  try {
    const body = await req.json()
    privateKey = typeof body?.privateKey === 'string' ? body.privateKey : undefined
  } catch {
    privateKey = undefined
  }

  if (note.hasPrivateKey && !privateKey) {
    return NextResponse.json(
      { error: 'A private key is required to view this note.', requiresKey: true },
      { status: 401 }
    )
  }

  if (note.hasPrivateKey && privateKey) {
    const attemptKey = `${ip}:${params.slug}`
    const { success: keyAttemptsOk } = await wrongKeyLimiter.limit(attemptKey)
    if (!keyAttemptsOk) {
      await sleep(800)
      return NextResponse.json(
        { error: 'Too many incorrect attempts. Try again in a few minutes.', requiresKey: true },
        { status: 429 }
      )
    }
  }

  try {
    const content = note.cipherText
      ? decryptContent({
          cipherText: note.cipherText,
          iv: note.iv,
          authTag: note.authTag,
          salt: note.salt,
          privateKey,
        })
      : ''

    const mediaToken = note.attachment ? issueMediaToken(params.slug) : null
    const attachmentMeta = toPublicAttachment(note)
    const watermark = { ip, viewedAt: Date.now(), viewId: generateViewId() }
    if (note.burnAfterReading) {
      await redis.del(noteKey(params.slug))

      const response: RevealNoteResponse = {
        content,
        views: note.views + 1,
        createdAt: note.createdAt,
        expiresAt: note.expiresAt,
        burned: true,
        attachment: attachmentMeta,
        mediaToken,
        watermark,
      }
      return NextResponse.json(response, { status: 200 })
    }

    const updated: StoredNote = { ...note, views: note.views + 1 }
    const remainingTtlSeconds = Math.max(1, Math.ceil((note.expiresAt - Date.now()) / 1000))
    await redis.set(noteKey(params.slug), updated, { ex: remainingTtlSeconds })

    const response: RevealNoteResponse = {
      content,
      views: updated.views,
      createdAt: note.createdAt,
      expiresAt: note.expiresAt,
      burned: false,
      attachment: attachmentMeta,
      mediaToken,
      watermark,
    }
    return NextResponse.json(response, { status: 200 })
  } catch (err) {
    await sleep(300 + Math.floor(Math.random() * 300))
    return NextResponse.json(
      { error: 'Incorrect private key.', requiresKey: true },
      { status: 401 }
    )
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { slug: string } }) {
  const note = await loadNote(params.slug)
  if (!note || note.deleted || isExpired(note)) {
    return NextResponse.json({ error: 'Note not found.' }, { status: 404 })
  }

  const token = req.nextUrl.searchParams.get('token')
  if (!token || sha256Hex(token) !== note.ownerTokenHash) {
    return NextResponse.json({ error: 'Not authorized to modify this note.' }, { status: 403 })
  }

  let body: ExtendNoteRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (!Number.isFinite(body.additionalSeconds) || body.additionalSeconds <= 0) {
    return NextResponse.json({ error: 'Invalid extension amount.' }, { status: 400 })
  }

  const maxAllowedExpiry = note.createdAt + MAX_DURATION_SECONDS * 1000
  const newExpiresAt = Math.min(note.expiresAt + body.additionalSeconds * 1000, maxAllowedExpiry)

  const updated: StoredNote = { ...note, expiresAt: newExpiresAt }
  const newTtlSeconds = Math.max(1, Math.ceil((newExpiresAt - Date.now()) / 1000))
  await redis.set(noteKey(params.slug), updated, { ex: newTtlSeconds })

  const response: ExtendNoteResponse = { expiresAt: newExpiresAt }
  return NextResponse.json(response, { status: 200 })
}

export async function DELETE(req: NextRequest, { params }: { params: { slug: string } }) {
  const note = await loadNote(params.slug)

  if (!note) {
    return NextResponse.json({ error: 'Note not found.' }, { status: 404 })
  }

  const token = req.nextUrl.searchParams.get('token')
  if (!token || sha256Hex(token) !== note.ownerTokenHash) {
    return NextResponse.json({ error: 'Not authorized to delete this note.' }, { status: 403 })
  }

  await redis.del(noteKey(params.slug))
  if (note.attachment) {
    await deleteBlobSafely(note.attachment.blobPathname)
  }

  return NextResponse.json({ deleted: true }, { status: 200 })
}