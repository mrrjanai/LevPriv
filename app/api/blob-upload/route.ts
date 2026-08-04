import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextResponse } from 'next/server'
import { ALL_ALLOWED_MEDIA_TYPES, MAX_MEDIA_BYTES } from '@/lib/media'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody
  console.log('Token prefix in use:', process.env.BLOB_READ_WRITE_TOKEN?.slice(0, 20))

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
        // Nothing to do here - the client finalizes note creation via
        // POST /api/notes once the upload resolves, passing along the blob
        // URL/pathname/metadata. Redis is the source of truth for notes,
        // not Blob's own event system.
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    console.error('Blob upload token error:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}