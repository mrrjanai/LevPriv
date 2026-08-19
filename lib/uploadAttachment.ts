import { upload } from '@vercel/blob/client'
import type { AttachmentInput } from './types'

export async function uploadAttachment(
  file: File | Blob,
  fileName: string,
  mimeType: string,
  onProgress?: (percent: number) => void
): Promise<AttachmentInput> {
    // Strip codec info (e.g. ";codecs=opus") before telling Vercel the content
  // type - their allow-list check is an exact string match against the base
  // type, and recorded audio/video always comes tagged with codec details.
  // We still keep the full original mimeType in our own returned metadata.
  const baseContentType = mimeType.split(';')[0].trim()

  const blob = await upload(fileName, file, {
    access: 'private', // must match the store's actual access mode
    handleUploadUrl: '/api/blob-upload',
    contentType: baseContentType,
    onUploadProgress: (event) => {
      onProgress?.(Math.round(event.percentage))
    },
  })

  return {
    blobUrl: blob.url,
    blobPathname: blob.pathname,
    mimeType,
    fileName,
    sizeBytes: file.size,
  }
}