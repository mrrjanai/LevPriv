import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { isAllowedMediaType, MAX_MEDIA_BYTES } from '@/lib/media'
import { createLimiter, getClientIp } from '@/lib/ratelimit'

export const runtime = 'nodejs'

// This proxies the upload through our own server instead of the browser
// talking directly to Vercel Blob. That's a deliberate workaround: as of
// this writing, Vercel's documented direct-client-upload flow
// (handleUpload + upload()) has an active, unresolved platform bug where
// the browser's request to vercel.com/api/blob is rejected by CORS in some
// projects, with no fix or workaround available from Vercel's side yet.
// Proxying server-side avoids the browser ever needing to talk to Blob's
// endpoints directly, at the cost of being capped by Vercel's serverless
// function request body limit (~4.5MB on the Hobby plan).
export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const { success } = await createLimiter.limit(ip)
  if (!success) {
    return NextResponse.json({ error: 'Too many uploads. Please wait a moment.' }, { status: 429 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file')
    const mimeType = formData.get('mimeType')
    const fileName = formData.get('fileName')

    if (!(file instanceof Blob) || typeof mimeType !== 'string' || typeof fileName !== 'string') {
      return NextResponse.json({ error: 'Invalid upload.' }, { status: 400 })
    }

    if (!isAllowedMediaType(mimeType)) {
      return NextResponse.json({ error: 'That file type is not supported.' }, { status: 400 })
    }

    if (file.size > MAX_MEDIA_BYTES) {
      return NextResponse.json(
        { error: `File is too large (${Math.round(MAX_MEDIA_BYTES / (1024 * 1024))}MB limit).` },
        { status: 400 }
      )
    }

    const blob = await put(fileName.slice(0, 200), file, {
      access: 'private',
      addRandomSuffix: true,
      contentType: mimeType,
    })

    return NextResponse.json({
      blobUrl: blob.url,
      blobPathname: blob.pathname,
      mimeType,
      fileName: fileName.slice(0, 200),
      sizeBytes: file.size,
    })
  } catch (error) {
    console.error('Attachment upload error:', error)
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
  }
}