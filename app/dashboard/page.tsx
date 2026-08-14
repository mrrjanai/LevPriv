'use client'

import { useEffect, useState, useCallback } from 'react'
import { formatRemaining } from '@/lib/duration'
import type { LocalNoteRecord, NotePublicMeta } from '@/lib/types'
import { Toast } from '@/components/Toast'
import { useToast } from '@/lib/useToast'
import { Trash2 } from 'lucide-react'

interface DashboardEntry extends LocalNoteRecord {
  status: 'checking' | 'active' | 'expired' | 'deleted'
  views?: number
}

export default function DashboardPage() {
  const [entries, setEntries] = useState<DashboardEntry[]>([])
  const [loaded, setLoaded] = useState(false)
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null)
  const { message: toastMessage, showToast } = useToast()

  const refreshAll = useCallback(async (records: LocalNoteRecord[]) => {
    const withStatus: DashboardEntry[] = await Promise.all(
      records.map(async (record) => {
        try {
          const res = await fetch(
            `/api/notes/${record.slug}?token=${encodeURIComponent(record.ownerToken)}`
          )
          const data = (await res.json()) as NotePublicMeta
          if (!data.exists) {
            return { ...record, status: 'expired' as const }
          }
          return { ...record, status: 'active' as const, views: data.views, expiresAt: data.expiresAt! }
        } catch {
          return { ...record, status: 'expired' as const }
        }
      })
    )
    setEntries(withStatus)
  }, [])

  useEffect(() => {
    try {
      const stored: LocalNoteRecord[] = JSON.parse(localStorage.getItem('levpriv_notes') || '[]')
      refreshAll(stored).finally(() => setLoaded(true))
    } catch {
      setLoaded(true)
    }
  }, [refreshAll])

  function persist(updated: DashboardEntry[]) {
    setEntries(updated)
    try {
      const toStore: LocalNoteRecord[] = updated.map(
        ({ slug, ownerToken, createdAt, expiresAt, hasPrivateKey }) => ({
          slug,
          ownerToken,
          createdAt,
          expiresAt,
          hasPrivateKey,
        })
      )
      localStorage.setItem('levpriv_notes', JSON.stringify(toStore))
    } catch {
      // non-fatal
    }
  }

  async function handleDelete(entry: DashboardEntry) {
    setDeletingSlug(entry.slug)
    try {
      const res = await fetch(
        `/api/notes/${entry.slug}?token=${encodeURIComponent(entry.ownerToken)}`,
        { method: 'DELETE' }
      )
      if (res.ok) {
        showToast('Note permanently deleted')
        persist(entries.map((e) => (e.slug === entry.slug ? { ...e, status: 'deleted' } : e)))
      } else {
        showToast('Failed to delete note')
      }
    } finally {
      setDeletingSlug(null)
    }
  }

  function clearEntry(slug: string) {
    persist(entries.filter((e) => e.slug !== slug))
  }

  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <main className="flex-1 px-6 py-16">
      <div className="w-full max-w-2xl mx-auto">
        <div className="mb-10 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-medium tracking-tight">My notes</h1>
            <p className="text-base-muted mt-2 text-sm">
              Notes created from this browser. Nothing here needs an account â€” clearing your
              browser data clears this list, but doesn't affect the notes themselves.
            </p>
          </div>
          <a
            href="/"
            className="text-xs text-base-muted hover:text-base-white transition-colors mt-1 shrink-0"
          >
            New note
          </a>
        </div>

        {!loaded && <p className="text-sm text-base-muted">Loadingâ€¦</p>}

        {loaded && entries.length === 0 && (
          <div className="text-center py-16 border border-base-border rounded-md">
            <p className="text-base-muted text-sm">No notes yet from this browser.</p>
            <a
              href="/"
              className="inline-block mt-6 border border-base-border rounded-md px-5 py-2.5 text-sm hover:border-base-mid transition-colors"
            >
              Create your first note
            </a>
          </div>
        )}

        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.slug}
              className="border border-base-border rounded-md px-5 py-4 flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <a
                  href={`/manage/${entry.slug}?token=${entry.ownerToken}`}
                  className="text-sm text-base-white hover:underline truncate block"
                >
                  {appUrl}/note/{entry.slug}
                </a>
                <p className="text-xs text-base-muted mt-1">
                  {entry.status === 'checking' && 'Checkingâ€¦'}
                  {entry.status === 'active' &&
                    `Active Â· ${formatRemaining(entry.expiresAt - Date.now())} left${
                      entry.views !== undefined ? ` Â· ${entry.views} view${entry.views === 1 ? '' : 's'}` : ''
                    }`}
                  {entry.status === 'expired' && 'Self-destructed'}
                  {entry.status === 'deleted' && 'Deleted'}
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                {entry.status === 'active' && (
                  <button
                    onClick={() => handleDelete(entry)}
                    disabled={deletingSlug === entry.slug}
                    aria-label="Delete note"
                    className="text-base-muted hover:text-base-white transition-colors p-2 disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                {(entry.status === 'expired' || entry.status === 'deleted') && (
                  <button
                    onClick={() => clearEntry(entry.slug)}
                    className="text-xs text-base-muted hover:text-base-white transition-colors"
                  >
                    Remove from list
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <Toast message={toastMessage} />
    </main>
  )
}
