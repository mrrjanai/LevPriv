import { upload } from '@vercel/blob/client'
import type { AttachmentInput } from './types'

export async function uploadAttachment(
  file: File | Blob,
  fileName: string,
  mimeType: string,
  onProgress?: (percent: number) => void
): Promise<AttachmentInput> {
  const blob = await upload(fileName, file, {
    access: 'public',
    handleUploadUrl: '/api/blob-upload',
    contentType: mimeType,
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