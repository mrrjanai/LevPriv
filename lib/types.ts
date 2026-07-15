export interface CreateNoteRequest {
  content: string
  durationSeconds: number
  privateKey?: string
  burnAfterReading?: boolean
  // Honeypot + timing-trap fields for lightweight bot detection.
  // `website` should always be empty (real users never see/fill this field).
  // `formRenderedAt` is a client timestamp (ms) checked against arrival time.
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
}

export interface StoredNote {
  slug: string
  cipherText: string // base64
  iv: string // base64
  authTag: string // base64
  salt: string | null // base64, present only if user-supplied private key was used
  hasPrivateKey: boolean
  burnAfterReading: boolean
  ownerTokenHash: string // sha256 hex
  createdAt: number // epoch ms
  expiresAt: number // epoch ms
  views: number
  deleted: boolean
}

export interface NotePublicMeta {
  exists: boolean
  expired: boolean
  deleted: boolean
  hasPrivateKey: boolean
  burnAfterReading?: boolean
  expiresAt?: number
  createdAt?: number
  views?: number
}

export interface ExtendNoteRequest {
  additionalSeconds: number
}

export interface ExtendNoteResponse {
  expiresAt: number
}

// A note record kept client-side in localStorage so the no-login dashboard
// can list notes created from this browser.
export interface LocalNoteRecord {
  slug: string
  ownerToken: string
  createdAt: number
  expiresAt: number
  hasPrivateKey: boolean
}
