import { NextRequest, NextResponse } from 'next/server'
import { redis, noteKey } from '@/lib/redis'
import { encryptContent, sha256Hex, generateOwnerToken } from '@/lib/crypto'
import { generateSlug } from '@/lib/slug'
import { isValidDuration, MAX_CONTENT_LENGTH } from '@/lib/duration'
import { createLimiter, getClientIp } from '@/lib/ratelimit'
import type { CreateNoteRequest, CreateNoteResponse, StoredNote } from '@/lib/types'

export const runtime = 'nodejs'

// Hard ceiling on the raw request body, well above MAX_CONTENT_LENGTH to account
// for JSON overhead + base64 growth, but small enough to reject abusive payloads
// before they're ever parsed or sent to Redis.
const MAX_BODY_BYTES = 60_000

// Real users take at least this long to write a note and hit submit.
// A submission arriving faster than this is almost certainly a script.
const MIN_HUMAN_SUBMIT_MS = 1200

function sanitize(input: string): string {
  // Strip control characters (except newline/tab) to reduce risk of
  // injection into logs or downstream renderers. Content is never rendered
  // as HTML client-side (always plain text), so this is defense-in-depth.
  return input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const { success } = await createLimiter.limit(ip)
    if (!success) {
      return NextResponse.json(
        { error: 'Too many notes created. Please wait a minute and try again.' },
        { status: 429 }
      )
    }

    // Reject oversized requests before parsing JSON.
    const contentLength = Number(req.headers.get('content-length') || 0)
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Request too large.' }, { status: 413 })
    }

    const rawBody = await req.text()
    if (rawBody.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Request too large.' }, { status: 413 })
    }

    const body = JSON.parse(rawBody) as CreateNoteRequest

    // --- Lightweight bot detection (no external service, no login) ---
    // Honeypot: a field real users never see or fill. Bots that auto-fill
    // every input on a form will trip this.
    if (body.website && body.website.trim().length > 0) {
      // Respond as if it succeeded (don't tip off the bot) but do nothing.
      return NextResponse.json(
        { error: 'Unable to create note. Please try again.' },
        { status: 400 }
      )
    }
    // Timing trap: reject submissions that arrive suspiciously fast after
    // the form was rendered.
    if (
      typeof body.formRenderedAt === 'number' &&
      Date.now() - body.formRenderedAt < MIN_HUMAN_SUBMIT_MS
    ) {
      return NextResponse.json(
        { error: 'Please take a moment before submitting.' },
        { status: 400 }
      )
    }

    if (!body || typeof body.content !== 'string' || body.content.trim().length === 0) {
      return NextResponse.json({ error: 'Note content is required.' }, { status: 400 })
    }
    if (body.content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        { error: `Note content must be under ${MAX_CONTENT_LENGTH} characters.` },
        { status: 400 }
      )
    }
    if (!isValidDuration(body.durationSeconds)) {
      return NextResponse.json({ error: 'Invalid duration.' }, { status: 400 })
    }
    if (body.privateKey && body.privateKey.length > 256) {
      return NextResponse.json({ error: 'Private key is too long.' }, { status: 400 })
    }

    const cleanContent = sanitize(body.content)
    const { cipherText, iv, authTag, salt } = encryptContent(cleanContent, body.privateKey)

    const ownerToken = generateOwnerToken()
    const ownerTokenHash = sha256Hex(ownerToken)

    const now = Date.now()
    const expiresAt = now + body.durationSeconds * 1000

    // Generate a unique slug, retrying on the rare collision.
    let slug = generateSlug()
    for (let attempt = 0; attempt < 5; attempt++) {
      const exists = await redis.exists(noteKey(slug))
      if (!exists) break
      slug = generateSlug()
    }

    const note: StoredNote = {
      slug,
      cipherText,
      iv,
      authTag,
      salt,
      hasPrivateKey: Boolean(body.privateKey),
      burnAfterReading: Boolean(body.burnAfterReading),
      ownerTokenHash,
      createdAt: now,
      expiresAt,
      views: 0,
      deleted: false,
    }

    // Store with a Redis TTL that matches expiry so it's auto-purged even if
    // our own expiry check is bypassed.
    await redis.set(noteKey(slug), note, { ex: body.durationSeconds })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin

    const response: CreateNoteResponse = {
      slug,
      ownerToken,
      url: `${appUrl}/note/${slug}`,
      manageUrl: `${appUrl}/manage/${slug}?token=${ownerToken}`,
      expiresAt,
      hasPrivateKey: note.hasPrivateKey,
    }

    return NextResponse.json(response, { status: 201 })
  } catch (err) {
    console.error('Error creating note:', err)
    return NextResponse.json({ error: 'Failed to create note.' }, { status: 500 })
  }
}
