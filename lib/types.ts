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
  attachment?: AttachmentInput
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
  hasAttachment: boolean
}

export interface StoredNote {
  slug: string
  cipherText: string
  iv: string
  authTag: string
  salt: string | null
  hasPrivateKey: boolean
  burnAfterReading: boolean
  attachment: StoredAttachment | null
  ownerTokenHash: string
  createdAt: number
  expiresAt: number
  views: number
  deleted: boolean
}

export interface NotePublicMeta {
  exists: boolean
  expired: boolean
  deleted: boolean
  hasPrivateKey: boolean
  burnAfterReading?: boolean
  attachment?: PublicAttachmentMeta | null
  expiresAt?: number
  createdAt?: number
  views?: number
}

export interface RevealNoteResponse {
  content: string
  views: number
  createdAt: number
  expiresAt: number
  burned: boolean
  attachment: PublicAttachmentMeta | null
  mediaToken: string | null
}

export interface ExtendNoteRequest {
  additionalSeconds: number
}

export interface ExtendNoteResponse {
  expiresAt: number
}

export interface LocalNoteRecord {
  slug: string
  ownerToken: string
  createdAt: number
  expiresAt: number
  hasPrivateKey: boolean
  hasAttachment?: boolean
}