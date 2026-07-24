import { del } from '@vercel/blob'

export async function deleteBlobSafely(pathname: string): Promise<void> {
  try {
    await del(pathname)
  } catch (err) {
    // Best-effort cleanup. If this fails, the file is already unreachable to
    // any visitor (the note record gating access is gone), so this only
    // affects storage housekeeping, not user-facing security.
    console.error('Failed to delete blob:', pathname, err)
  }
}