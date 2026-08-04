export type MediaKind = 'audio' | 'video' | 'image' | 'file'

// 25MB ceiling - comfortably covers voice memos, short clips, photos, and
// typical documents, while staying well within Vercel's request limits when
// uploads go directly client-to-Blob (bypassing our own serverless function
// body-size limits entirely).
// 4MB ceiling - Vercel's serverless functions cap request bodies at ~4.5MB
// on the Hobby plan. We proxy uploads through our own server (see
// app/api/attachments/upload/route.ts) rather than direct client-to-Blob,
// to work around a currently unresolved CORS bug in Vercel's own direct
// client-upload flow. That tradeoff means a smaller cap than the 25MB we'd
// get with true client uploads, but it actually works today.
export const MAX_MEDIA_BYTES = 4 * 1024 * 1024

export const ALLOWED_MEDIA_TYPES: Record<MediaKind, string[]> = {
  image: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
  audio: ['audio/webm', 'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg'],
  video: ['video/webm', 'video/mp4', 'video/quicktime'],
  file: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'text/plain',
    'text/csv',
  ],
}

export const ALL_ALLOWED_MEDIA_TYPES: string[] = Object.values(ALLOWED_MEDIA_TYPES).flat()

export function detectMediaKind(mimeType: string): MediaKind {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType.startsWith('video/')) return 'video'
  return 'file'
}

export function isAllowedMediaType(mimeType: string): boolean {
  return ALL_ALLOWED_MEDIA_TYPES.includes(mimeType)
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}