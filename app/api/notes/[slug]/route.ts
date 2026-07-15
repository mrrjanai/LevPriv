import { NextRequest, NextResponse } from 'next/server'
import { redis, noteKey } from '@/lib/redis'
import { decryptContent, sha256Hex } from '@/lib/crypto'
import { viewLimiter, wrongKeyLimiter, getClientIp } from '@/lib/ratelimit'
import { MAX_DURATION_SECONDS } from '@/lib/duration'
import type { StoredNote, NotePublicMeta, ExtendNoteRequest, ExtendNoteResponse } from '@/lib/types'

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

// GET: returns non-sensitive metadata only (never the decrypted content).
// Used for the countdown timer and to know whether a private key is required.
// If a valid owner token is supplied as a query param, also returns view/owner stats.
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const ip = getClientIp(req)
  const { success } = await viewLimiter.limit(ip)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests. Slow down.' }, { status: 429 })
  }

  const note = await loadNote(params.slug)

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
    expiresAt: note.expiresAt,
    createdAt: note.createdAt,
    views: isOwner ? note.views : undefined,
  }

  return NextResponse.json(meta, { status: 200 })
}

// POST: reveals decrypted note content (requires privateKey in body if the
// note was created with one). Increments the view counter on success, and
// destroys the note immediately if burnAfterReading is set.
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const ip = getClientIp(req)
  const { success } = await viewLimiter.limit(ip)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests. Slow down.' }, { status: 429 })
  }

  const note = await loadNote(params.slug)

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

  // Lockout + artificial delay on wrong-key attempts to slow brute-forcing.
  // Keyed by slug+ip so an attacker can't lock a note out for its real owner
  // by hammering it from a different IP.
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
    const content = decryptContent({
      cipherText: note.cipherText,
      iv: note.iv,
      authTag: note.authTag,
      salt: note.salt,
      privateKey,
    })

    if (note.burnAfterReading) {
      // Destroy immediately after a successful read.
      await redis.del(noteKey(params.slug))
      return NextResponse.json(
        {
          content,
          views: note.views + 1,
          createdAt: note.createdAt,
          expiresAt: note.expiresAt,
          burned: true,
        },
        { status: 200 }
      )
    }

    // Increment view count. Best-effort; note may have just expired between
    // the read above and this write, in which case ex will simply re-apply
    // a fresh TTL slightly extending life by a fraction of a second — acceptable.
    const updated: StoredNote = { ...note, views: note.views + 1 }
    const remainingTtlSeconds = Math.max(1, Math.ceil((note.expiresAt - Date.now()) / 1000))
    await redis.set(noteKey(params.slug), updated, { ex: remainingTtlSeconds })

    return NextResponse.json(
      {
        content,
        views: updated.views,
        createdAt: note.createdAt,
        expiresAt: note.expiresAt,
        burned: false,
      },
      { status: 200 }
    )
  } catch (err) {
    // Small artificial delay on wrong key too, independent of the lockout
    // counter above, so single-attempt timing can't reveal correctness fast.
    await sleep(300 + Math.floor(Math.random() * 300))
    return NextResponse.json(
      { error: 'Incorrect private key.', requiresKey: true },
      { status: 401 }
    )
  }
}

// PATCH: owner-only expiration extension.
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

// DELETE: owner-only manual destruction. Requires ?token= matching the
// secret ownerToken issued at creation time.
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

  return NextResponse.json({ deleted: true }, { status: 200 })
}
