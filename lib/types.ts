import type { MediaKind } from './media'

export interface AttachmentInput {
  blobUrl: string
  blobPathname: string
  mimeType: string
  fileName: string
  sizeBytes: number
}

export interface StoredAttachment extends AttachmentInput {
  kind: MediaKind
}

// What the client is allowed to see about an attachment - never blobUrl or
// blobPathname, which would let someone bypass our access gating entirely.
export interface PublicAttachmentMeta {
  kind: MediaKind
  mimeType: string
  fileName: string
  sizeBytes: number
}

export interface CreateNoteRequest {
  content: string
  durationSeconds: number
  privateKey?: string
  burnAfterReading?: boolean
  attachments?: AttachmentInput[]
  website?: string
  formRenderedAt?: number
}

export interface CreateNoteResponse {
  slug: string
  ownerToken: string
  url: string
  manageUrl: string
  expiresAt: number
  hasPrivateKey: boolean
  attachmentCount: number
}

export interface StoredNote {
  slug: string
  cipherText: string
  iv: string
  authTag: string
  salt: string | null
  hasPrivateKey: boolean
  burnAfterReading: boolean
  attachments: StoredAttachment[]
  ownerTokenHash: string
  createdAt: number
  expiresAt: number
  views: number
  deleted: boolean
  deletionScheduledAt: number | null
}

export interface NotePublicMeta {
  exists: boolean
  expired: boolean
  deleted: boolean
  hasPrivateKey: boolean
  burnAfterReading?: boolean
  attachments?: PublicAttachmentMeta[]
  expiresAt?: number
  createdAt?: number
  views?: number
  deletionScheduledAt?: number | null
}

export interface ViewWatermark {
  ip: string
  viewedAt: number
  viewId: string
}

export interface RevealNoteResponse {
  content: string
  views: number
  createdAt: number
  expiresAt: number
  burned: boolean
  attachments: PublicAttachmentMeta[]
  mediaToken: string | null
  watermark: ViewWatermark
}

export interface ExtendNoteRequest {
  additionalSeconds?: number
  cancelDeletion?: boolean
}

export interface ExtendNoteResponse {
  expiresAt?: number
  cancelled?: boolean
}

export interface DeleteNoteResponse {
  scheduled?: boolean
  deleted?: boolean
  deleteAt?: number
}

export interface LocalNoteRecord {
  slug: string
  ownerToken: string
  createdAt: number
  expiresAt: number
  hasPrivateKey: boolean
  attachmentCount?: number
}