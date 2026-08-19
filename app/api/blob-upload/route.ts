import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextResponse } from 'next/server'
import { ALL_ALLOWED_MEDIA_TYPES, MAX_MEDIA_BYTES } from '@/lib/media'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: ALL_ALLOWED_MEDIA_TYPES,
          addRandomSuffix: true,
          maximumSizeInBytes: MAX_MEDIA_BYTES,
        }
      },
      onUploadCompleted: async () => {
        // No DB write needed - the client finalizes note creation via
        // POST /api/notes once the upload resolves, passing along the blob
        // metadata. Redis stays the source of truth for notes.
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}