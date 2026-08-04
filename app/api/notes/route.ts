import { NextRequest, NextResponse } from 'next/server'
import { redis, noteKey } from '@/lib/redis'
import { encryptContent, sha256Hex, generateOwnerToken } from '@/lib/crypto'
import { generateSlug } from '@/lib/slug'
import { isValidDuration, MAX_CONTENT_LENGTH } from '@/lib/duration'
import { createLimiter, getClientIp } from '@/lib/ratelimit'
import { isAllowedMediaType, detectMediaKind, MAX_MEDIA_BYTES } from '@/lib/media'
import { deleteBlobSafely } from '@/lib/blob'
import type { CreateNoteRequest, CreateNoteResponse, StoredNote, StoredAttachment } from '@/lib/types'

export const runtime = 'nodejs'

const MAX_BODY_BYTES = 60_000
const MIN_HUMAN_SUBMIT_MS = 1200

function sanitize(input: string): string {
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

    const contentLength = Number(req.headers.get('content-length') || 0)
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Request too large.' }, { status: 413 })
    }

    const rawBody = await req.text()
    if (rawBody.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Request too large.' }, { status: 413 })
    }

    const body = JSON.parse(rawBody) as CreateNoteRequest

    if (body.website && body.website.trim().length > 0) {
      return NextResponse.json(
        { error: 'Unable to create note. Please try again.' },
        { status: 400 }
      )
    }
    if (
      typeof body.formRenderedAt === 'number' &&
      Date.now() - body.formRenderedAt < MIN_HUMAN_SUBMIT_MS
    ) {
      return NextResponse.json(
        { error: 'Please take a moment before submitting.' },
        { status: 400 }
      )
    }

    if (
      !body ||
      typeof body.content !== 'string' ||
      (body.content.trim().length === 0 && !body.attachment)
    ) {
      return NextResponse.json(
        { error: 'Add some text or an attachment before creating the note.' },
        { status: 400 }
      )
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

    let storedAttachment: StoredAttachment | null = null
    if (body.attachment) {
      const { blobUrl, blobPathname, mimeType, fileName, sizeBytes } = body.attachment
      if (!blobUrl || !blobPathname || !mimeType || !fileName || !Number.isFinite(sizeBytes)) {
        return NextResponse.json({ error: 'Invalid attachment data.' }, { status: 400 })
      }
      if (!isAllowedMediaType(mimeType)) {
        return NextResponse.json({ error: 'That file type is not supported.' }, { status: 400 })
      }
      if (sizeBytes > MAX_MEDIA_BYTES) {
        await deleteBlobSafely(blobPathname)
       return NextResponse.json(
          { error: `Attachment is too large (${Math.round(MAX_MEDIA_BYTES / (1024 * 1024))}MB limit).` },
          { status: 400 }
        )
      }
      storedAttachment = {
        blobUrl,
        blobPathname,
        mimeType,
        fileName: fileName.slice(0, 200),
        sizeBytes,
        kind: detectMediaKind(mimeType),
      }
    }

    const cleanContent = sanitize(body.content)
    const { cipherText, iv, authTag, salt } = encryptContent(cleanContent, body.privateKey)

    const ownerToken = generateOwnerToken()
    const ownerTokenHash = sha256Hex(ownerToken)

    const now = Date.now()
    const expiresAt = now + body.durationSeconds * 1000

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
      attachment: storedAttachment,
      ownerTokenHash,
      createdAt: now,
      expiresAt,
      views: 0,
      deleted: false,
    }

    await redis.set(noteKey(slug), note, { ex: body.durationSeconds })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin

    const response: CreateNoteResponse = {
      slug,
      ownerToken,
      url: `${appUrl}/note/${slug}`,
      manageUrl: `${appUrl}/manage/${slug}?token=${ownerToken}`,
      expiresAt,
      hasPrivateKey: note.hasPrivateKey,
      hasAttachment: Boolean(storedAttachment),
    }

    return NextResponse.json(response, { status: 201 })
  } catch (err) {
    console.error('Error creating note:', err)
    return NextResponse.json({ error: 'Failed to create note.' }, { status: 500 })
  }
}